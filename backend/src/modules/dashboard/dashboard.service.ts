import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, type Repository } from 'typeorm';
import { AuditEvent, EntityType } from '../../entities/audit-event.entity';
import { Payable, PayableStatus } from '../../entities/payable.entity';
import { Receipt, ReceiptStatus } from '../../entities/receipt.entity';
import { Statement, StatementStatus } from '../../entities/statement.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { Workspace } from '../../entities/workspace.entity';
import type {
  DashboardActionItem,
  DashboardCashFlowPoint,
  DashboardDataHealth,
  DashboardFinancialSnapshot,
  DashboardRecentActivity,
  DashboardResponse,
  DashboardTopCategory,
  DashboardTopMerchant,
} from './interfaces/dashboard-response.interface';
import type { DashboardTrendsResponse } from './interfaces/dashboard-trends.interface';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Statement)
    private readonly statementRepo: Repository<Statement>,
    @InjectRepository(Payable)
    private readonly payableRepo: Repository<Payable>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
  ) {}

  async getDashboard(
    userId: string,
    workspaceId: string,
    range: '7d' | '30d' | '90d' = '30d',
    endDateParam?: string,
  ): Promise<DashboardResponse> {
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

    const requestedWindow = this.getWindowBounds(
      days,
      endDateParam ? new Date(endDateParam) : new Date(),
    );

    const [initialSnapshot, actions, recentActivity, memberRole, dataHealth] = await Promise.all([
      this.getSnapshot(workspaceId, requestedWindow.since, requestedWindow.endDate),
      this.getActions(userId, workspaceId),
      this.getRecentActivity(workspaceId),
      this.getMemberRole(userId, workspaceId),
      this.getDataHealth(workspaceId),
    ]);

    let snapshot = initialSnapshot;
    let effectiveWindow = requestedWindow;
    let autoShifted = false;

    if (!endDateParam && snapshot.income30d === 0 && snapshot.expense30d === 0) {
      const latestTransactionDate = await this.getLatestTransactionDate(workspaceId);

      if (latestTransactionDate) {
        effectiveWindow = this.getWindowBounds(days, latestTransactionDate);
        snapshot = await this.getSnapshot(
          workspaceId,
          effectiveWindow.since,
          effectiveWindow.endDate,
        );
        autoShifted = true;
      }
    }

    const [cashFlow, topMerchants, topCategories] = await Promise.all([
      this.getCashFlow(workspaceId, effectiveWindow.since, effectiveWindow.endDate, days),
      this.getTopMerchants(workspaceId, effectiveWindow.since, effectiveWindow.endDate),
      this.getTopCategories(workspaceId, effectiveWindow.since, effectiveWindow.endDate),
    ]);

    const response: DashboardResponse = {
      snapshot,
      actions,
      cashFlow,
      topMerchants,
      topCategories,
      recentActivity,
      role: memberRole,
      range,
      dataHealth,
    };

    if (autoShifted) {
      response.effectiveEndDate = this.formatDateOnly(effectiveWindow.endDate);
      response.effectiveSince = this.formatDateOnly(effectiveWindow.since);
    }

    return response;
  }

  private async getSnapshot(
    workspaceId: string,
    since: Date,
    endDate: Date,
  ): Promise<DashboardFinancialSnapshot> {
    const txResult = await this.transactionRepo
      .createQueryBuilder('t')
      .innerJoin('t.statement', 's')
      .select([
        'COALESCE(SUM(CASE WHEN t.transactionType = :income THEN t.credit ELSE 0 END), 0) AS income',
        'COALESCE(SUM(CASE WHEN t.transactionType = :expense THEN t.debit ELSE 0 END), 0) AS expense',
        'COALESCE(SUM(CASE WHEN s.status IN (:...unapprovedStatuses) THEN (CASE WHEN t.transactionType = :income THEN t.credit ELSE -t.debit END) ELSE 0 END), 0) AS "unapprovedCash"',
      ])
      .where('s.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.transactionDate BETWEEN :since AND :endDate', { since, endDate })
      .andWhere('s.deletedAt IS NULL')
      .andWhere('t.isDuplicate = false')
      .andWhere('s.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [StatementStatus.ERROR, StatementStatus.PROCESSING],
      })
      .setParameter('income', TransactionType.INCOME)
      .setParameter('expense', TransactionType.EXPENSE)
      .setParameter('unapprovedStatuses', [
        StatementStatus.UPLOADED,
        StatementStatus.PARSED,
        StatementStatus.VALIDATED,
      ])
      .getRawOne<{ income: string; expense: string; unapprovedCash: string }>();

    // All-time balance: income credits minus expense debits, no date range
    const balanceQuery = this.transactionRepo.createQueryBuilder('t').innerJoin('t.statement', 's');
    this.applyWorkspaceStatementFilters(balanceQuery, workspaceId, true);

    const balanceResult = await balanceQuery
      .select(
        `COALESCE(SUM(CASE WHEN t.transactionType = :balIncome THEN t.credit WHEN t.transactionType = :balExpense THEN -t.debit ELSE 0 END), 0)`,
        'totalBalance',
      )
      .setParameter('balIncome', TransactionType.INCOME)
      .setParameter('balExpense', TransactionType.EXPENSE)
      .getRawOne<{ totalBalance: string }>();

    const totalBalance = Number.parseFloat(balanceResult?.totalBalance ?? '') || 0;

    const payableResult = await this.payableRepo
      .createQueryBuilder('p')
      .select([
        'COALESCE(SUM(CASE WHEN p.status IN (:...payStatuses) THEN p.amount ELSE 0 END), 0) AS "totalPayable"',
        'COALESCE(SUM(CASE WHEN p.status = :overdue THEN p.amount ELSE 0 END), 0) AS "totalOverdue"',
      ])
      .where('p.workspaceId = :workspaceId', { workspaceId })
      .andWhere('p.deletedAt IS NULL')
      .setParameter('payStatuses', [PayableStatus.TO_PAY, PayableStatus.SCHEDULED])
      .setParameter('overdue', PayableStatus.OVERDUE)
      .getRawOne<{ totalPayable: string; totalOverdue: string }>();

    const income = Number.parseFloat(txResult?.income ?? '') || 0;
    const expense = Number.parseFloat(txResult?.expense ?? '') || 0;
    const unapprovedCash = Number.parseFloat(txResult?.unapprovedCash ?? '') || 0;
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
      select: ['currency'],
    });

    return {
      totalBalance,
      income30d: income,
      expense30d: expense,
      netFlow30d: income - expense,
      totalPayable: Number.parseFloat(payableResult?.totalPayable ?? '') || 0,
      totalOverdue: Number.parseFloat(payableResult?.totalOverdue ?? '') || 0,
      unapprovedCash,
      currency: workspace?.currency || 'KZT',
    };
  }

  private async getActions(userId: string, workspaceId: string): Promise<DashboardActionItem[]> {
    const actions: DashboardActionItem[] = [];

    const pendingSubmit = await this.statementRepo.count({
      where: {
        workspaceId,
        status: StatementStatus.UPLOADED,
        deletedAt: IsNull(),
      },
    });

    if (pendingSubmit > 0) {
      actions.push({
        type: 'statements_pending_submit',
        count: pendingSubmit,
        label: `${pendingSubmit} statement${pendingSubmit > 1 ? 's' : ''} pending submit`,
        href: '/statements/submit',
      });
    }

    const pendingReview = await this.statementRepo.count({
      where: {
        workspaceId,
        status: In([StatementStatus.PARSED, StatementStatus.VALIDATED]),
        deletedAt: IsNull(),
      },
    });

    if (pendingReview > 0) {
      actions.push({
        type: 'statements_pending_review',
        count: pendingReview,
        label: `${pendingReview} statement${pendingReview > 1 ? 's' : ''} need review`,
        href: '/statements/approve',
      });
    }

    const overduePayments = await this.payableRepo.count({
      where: {
        workspaceId,
        status: PayableStatus.OVERDUE,
        deletedAt: IsNull(),
      },
    });

    if (overduePayments > 0) {
      actions.push({
        type: 'payments_overdue',
        count: overduePayments,
        label: `${overduePayments} payment${overduePayments > 1 ? 's' : ''} overdue`,
        href: '/statements/pay?status=overdue',
      });
    }

    const uncategorized = await this.transactionRepo
      .createQueryBuilder('t')
      .innerJoin('t.statement', 's')
      .where('s.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.categoryId IS NULL')
      .andWhere('s.deletedAt IS NULL')
      .andWhere('t.isDuplicate = false')
      .getCount();

    if (uncategorized > 0) {
      actions.push({
        type: 'transactions_uncategorized',
        count: uncategorized,
        label: `${uncategorized} transaction${uncategorized > 1 ? 's' : ''} uncategorized`,
        href: '/statements?missingCategory=true',
      });
    }

    const pendingReceipts = await this.receiptRepo.count({
      where: {
        workspaceId,
        status: In([ReceiptStatus.NEW, ReceiptStatus.NEEDS_REVIEW]),
      },
    });

    if (pendingReceipts > 0) {
      actions.push({
        type: 'receipts_pending_review',
        count: pendingReceipts,
        label: `${pendingReceipts} receipt${pendingReceipts > 1 ? 's' : ''} need review`,
        href: '/statements?missingCategory=true',
      });
    }

    return actions;
  }

  private async getCashFlow(
    workspaceId: string,
    since: Date,
    endDate: Date,
    days: number,
  ): Promise<DashboardCashFlowPoint[]> {
    const groupFormat = this.getTransactionGroupFormat(days);

    const query = this.transactionRepo.createQueryBuilder('t').innerJoin('t.statement', 's');

    this.applyActiveStatementTransactionFilters(query, workspaceId, since, endDate);

    const result = await query
      .select(`TO_CHAR(t.transactionDate, ${groupFormat})`, 'date')
      .addSelect(
        'COALESCE(SUM(CASE WHEN t.transactionType = :income THEN t.credit ELSE 0 END), 0)',
        'income',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN t.transactionType = :expense THEN t.debit ELSE 0 END), 0)',
        'expense',
      )
      .groupBy(`TO_CHAR(t.transactionDate, ${groupFormat})`)
      .orderBy(`TO_CHAR(t.transactionDate, ${groupFormat})`, 'ASC')
      .setParameter('income', TransactionType.INCOME)
      .setParameter('expense', TransactionType.EXPENSE)
      .getRawMany<{ date: string; income: string; expense: string }>();

    return result.map(row => ({
      date: row.date,
      income: Number.parseFloat(row.income ?? '') || 0,
      expense: Number.parseFloat(row.expense ?? '') || 0,
    }));
  }

  private async getTopMerchants(
    workspaceId: string,
    since: Date,
    endDate: Date,
  ): Promise<DashboardTopMerchant[]> {
    const query = this.transactionRepo.createQueryBuilder('t').innerJoin('t.statement', 's');

    this.applyActiveStatementTransactionFilters(query, workspaceId, since, endDate);

    const result = await query
      .select('t.counterpartyName', 'name')
      .addSelect('COALESCE(SUM(t.debit), 0)', 'amount')
      .addSelect('COUNT(t.id)', 'count')
      .andWhere('t.transactionType = :expense', { expense: TransactionType.EXPENSE })
      .andWhere('t.counterpartyName IS NOT NULL')
      .andWhere("t.counterpartyName != ''")
      .groupBy('t.counterpartyName')
      .orderBy('amount', 'DESC')
      .limit(5)
      .getRawMany<{ name: string; amount: string; count: string }>();

    return this.mapNamedAmountCountRows(result);
  }

  private async getTopCategories(
    workspaceId: string,
    since: Date,
    endDate: Date,
  ): Promise<DashboardTopCategory[]> {
    const query = this.transactionRepo
      .createQueryBuilder('t')
      .innerJoin('t.statement', 's')
      .leftJoin('t.category', 'c');

    this.applyActiveStatementTransactionFilters(query, workspaceId, since, endDate);

    const result = await query
      .select('c.id', 'id')
      .addSelect("COALESCE(c.name, 'Uncategorized')", 'name')
      .addSelect('COALESCE(SUM(t.debit), 0)', 'amount')
      .addSelect('COUNT(t.id)', 'count')
      .andWhere('t.transactionType = :expense', { expense: TransactionType.EXPENSE })
      .groupBy('c.id')
      .addGroupBy('c.name')
      .orderBy('amount', 'DESC')
      .limit(5)
      .getRawMany<{ id: string | null; name: string; amount: string; count: string }>();

    return result.map(row => ({
      id: row.id || null,
      name: row.name,
      amount: Number.parseFloat(row.amount) || 0,
      count: Number.parseInt(row.count, 10) || 0,
    }));
  }

  private async getRecentActivity(workspaceId: string): Promise<DashboardRecentActivity[]> {
    const auditEvents = await this.auditRepo.find({
      where: {
        workspaceId,
        entityType: In([
          EntityType.STATEMENT,
          EntityType.TRANSACTION,
          EntityType.PAYABLE,
          EntityType.CATEGORY,
        ]),
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Fallback to statement/transaction query if no audit events yet
    if (auditEvents.length === 0) {
      return this.getRecentActivityFallback(workspaceId);
    }

    return auditEvents.map(event => {
      let type: DashboardRecentActivity['type'] = 'transaction';
      let href = '/statements';

      if (event.entityType === EntityType.STATEMENT) {
        type = 'statement_upload';
        href = `/statements/${event.entityId}/view`;
      } else if (event.entityType === EntityType.PAYABLE) {
        type = 'payment';
        href = '/statements/pay';
      } else if (event.entityType === EntityType.CATEGORY) {
        type = 'categorization';
        href = '/statements';
      }

      const meta = event.meta as Record<string, unknown> | null;

      return {
        id: event.id,
        type,
        title:
          (meta?.fileName as string) ||
          (meta?.counterpartyName as string) ||
          (meta?.name as string) ||
          event.entityId,
        description: `${event.action} · ${event.actorLabel}`,
        amount: (meta?.amount as number) ?? null,
        timestamp: event.createdAt.toISOString(),
        href,
      };
    });
  }

  private async getRecentActivityFallback(workspaceId: string): Promise<DashboardRecentActivity[]> {
    const recentStatements = await this.statementRepo.find({
      where: { workspaceId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 3,
      select: ['id', 'fileName', 'status', 'totalTransactions', 'createdAt'],
    });

    const recentTransactions = await this.transactionRepo
      .createQueryBuilder('t')
      .innerJoin('t.statement', 's')
      .leftJoinAndSelect('t.category', 'c')
      .select([
        't.id',
        't.counterpartyName',
        't.debit',
        't.credit',
        't.transactionType',
        't.updatedAt',
        'c.id',
        'c.name',
      ])
      .where('s.workspaceId = :workspaceId', { workspaceId })
      .andWhere('s.deletedAt IS NULL')
      .orderBy('t.updatedAt', 'DESC')
      .take(5)
      .getMany();

    const activities: DashboardRecentActivity[] = [];

    for (const stmt of recentStatements) {
      activities.push({
        id: stmt.id,
        type: 'statement_upload',
        title: stmt.fileName,
        description: `${stmt.totalTransactions} transactions · ${stmt.status}`,
        amount: null,
        timestamp: stmt.createdAt.toISOString(),
        href: `/statements/${stmt.id}/view`,
      });
    }

    for (const tx of recentTransactions) {
      const credit = Number(tx.credit ?? 0);
      const debit = Number(tx.debit ?? 0);
      const amount = tx.transactionType === TransactionType.INCOME ? credit : -debit;

      activities.push({
        id: tx.id,
        type: tx.category ? 'categorization' : 'transaction',
        title: tx.counterpartyName || 'Unknown',
        description: tx.category?.name || null,
        amount,
        timestamp: tx.updatedAt.toISOString(),
        href: '/statements',
      });
    }

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }

  private async getMemberRole(
    userId: string,
    workspaceId: string,
  ): Promise<'owner' | 'admin' | 'member' | 'viewer'> {
    const member = await this.memberRepo.findOne({
      where: { userId, workspaceId },
      select: ['role'],
    });

    return (member?.role as 'owner' | 'admin' | 'member' | 'viewer') || 'member';
  }

  private async getDataHealth(workspaceId: string): Promise<DashboardDataHealth> {
    const [
      uncategorizedTransactions,
      statementsWithErrors,
      statementsPendingReview,
      statementsPendingSubmit,
      receiptsPendingReview,
      parsingWarnings,
      latestStatement,
      unapprovedCashResult,
    ] = await Promise.all([
      // uncategorized transactions (non-duplicate)
      this.transactionRepo
        .createQueryBuilder('t')
        .innerJoin('t.statement', 's')
        .where('s.workspaceId = :workspaceId', { workspaceId })
        .andWhere('t.categoryId IS NULL')
        .andWhere('s.deletedAt IS NULL')
        .andWhere('t.isDuplicate = false')
        .getCount(),
      // statements with errors
      this.statementRepo.count({
        where: { workspaceId, status: StatementStatus.ERROR, deletedAt: IsNull() },
      }),
      // statements pending review: parsed or validated
      this.statementRepo.count({
        where: {
          workspaceId,
          status: In([StatementStatus.PARSED, StatementStatus.VALIDATED]),
          deletedAt: IsNull(),
        },
      }),
      // statements pending submit: uploaded but not submitted yet
      this.statementRepo.count({
        where: {
          workspaceId,
          status: StatementStatus.UPLOADED,
          deletedAt: IsNull(),
        },
      }),
      // receipts pending review
      this.receiptRepo.count({
        where: {
          workspaceId,
          status: In([ReceiptStatus.NEW, ReceiptStatus.NEEDS_REVIEW]),
        },
      }),
      // parsing warnings: actual warnings captured in parsing details
      this.statementRepo
        .createQueryBuilder('s')
        .where('s.workspaceId = :workspaceId', { workspaceId })
        .andWhere('s.deletedAt IS NULL')
        .andWhere("jsonb_array_length(COALESCE(s.parsing_details->'warnings', '[]'::jsonb)) > 0")
        .getCount(),
      // latest statement upload date
      this.statementRepo.findOne({
        where: { workspaceId, deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
        select: ['createdAt'],
      }),
      // unapproved cash
      this.transactionRepo
        .createQueryBuilder('t')
        .innerJoin('t.statement', 's')
        .select(
          'COALESCE(SUM(CASE WHEN t.transactionType = :income THEN t.credit ELSE -t.debit END), 0)',
          'unapprovedCash',
        )
        .where('s.workspaceId = :workspaceId', { workspaceId })
        .andWhere('s.status IN (:...unapprovedStatuses)', {
          unapprovedStatuses: [
            StatementStatus.UPLOADED,
            StatementStatus.PARSED,
            StatementStatus.VALIDATED,
          ],
        })
        .andWhere('s.deletedAt IS NULL')
        .setParameter('income', TransactionType.INCOME)
        .getRawOne<{ unapprovedCash: string }>(),
    ]);

    return {
      uncategorizedTransactions,
      statementsWithErrors,
      statementsPendingReview,
      statementsPendingSubmit,
      receiptsPendingReview,
      unapprovedCash: Number.parseFloat(unapprovedCashResult?.unapprovedCash ?? '') || 0,
      lastUploadDate: latestStatement?.createdAt?.toISOString() ?? null,
      parsingWarnings,
    };
  }

  async getTrends(workspaceId: string, days = 30): Promise<DashboardTrendsResponse> {
    const requestedWindow = this.getWindowBounds(days, new Date());
    let effectiveWindow = requestedWindow;
    let trendData = await this.getTrendData(
      workspaceId,
      requestedWindow.since,
      requestedWindow.endDate,
      days,
    );
    let autoShifted = false;

    if (trendData.dailyRows.length === 0) {
      const latestTransactionDate = await this.getLatestTransactionDate(workspaceId);

      if (latestTransactionDate) {
        effectiveWindow = this.getWindowBounds(days, latestTransactionDate);
        trendData = await this.getTrendData(
          workspaceId,
          effectiveWindow.since,
          effectiveWindow.endDate,
          days,
        );
        autoShifted = true;
      }
    }

    const response: DashboardTrendsResponse = {
      dailyTrend: trendData.dailyRows.map(row => ({
        date: row.date,
        income: Number.parseFloat(row.income) || 0,
        expense: Number.parseFloat(row.expense) || 0,
      })),
      categories: trendData.categoryRows.map(row => ({
        name: row.name,
        amount: Number.parseFloat(row.amount) || 0,
        count: Number.parseInt(row.count, 10) || 0,
      })),
      counterparties: trendData.counterpartyRows.map(row => ({
        name: row.name,
        amount: Number.parseFloat(row.amount) || 0,
        count: Number.parseInt(row.count, 10) || 0,
      })),
      sources: {
        statements: {
          income: Number.parseFloat(trendData.sourceRows?.income ?? '') || 0,
          expense: Number.parseFloat(trendData.sourceRows?.expense ?? '') || 0,
          rows: Number.parseInt(trendData.sourceRows?.rows ?? '0', 10) || 0,
        },
      },
    };

    if (autoShifted) {
      response.effectiveEndDate = this.formatDateOnly(effectiveWindow.endDate);
      response.effectiveSince = this.formatDateOnly(effectiveWindow.since);
    }

    return response;
  }

  private getWindowBounds(days: number, targetDate: Date): { since: Date; endDate: Date } {
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const since = new Date(endDate);
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    return { since, endDate };
  }

  private async getLatestTransactionDate(workspaceId: string): Promise<Date | null> {
    const query = this.transactionRepo.createQueryBuilder('t').innerJoin('t.statement', 's');
    this.applyWorkspaceStatementFilters(query, workspaceId, true);

    const result = await query
      .select('MAX(t.transactionDate)', 'latestTransactionDate')
      .getRawOne<{ latestTransactionDate: Date | string | null }>();

    return result?.latestTransactionDate ? new Date(result.latestTransactionDate) : null;
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private async getTrendData(workspaceId: string, since: Date, endDate: Date, days: number) {
    const groupFormat = this.getTransactionGroupFormat(days);

    const [dailyRows, categoryRows, counterpartyRows, sourceRows] = await Promise.all([
      this.createTrendBaseQuery(workspaceId, since, endDate)
        .select(`TO_CHAR(t.transactionDate, ${groupFormat})`, 'date')
        .addSelect(
          'COALESCE(SUM(CASE WHEN t.transactionType = :income THEN t.credit ELSE 0 END), 0)',
          'income',
        )
        .addSelect(
          'COALESCE(SUM(CASE WHEN t.transactionType = :expense THEN t.debit ELSE 0 END), 0)',
          'expense',
        )
        .groupBy(`TO_CHAR(t.transactionDate, ${groupFormat})`)
        .orderBy(`TO_CHAR(t.transactionDate, ${groupFormat})`, 'ASC')
        .setParameter('income', TransactionType.INCOME)
        .setParameter('expense', TransactionType.EXPENSE)
        .getRawMany<{ date: string; income: string; expense: string }>(),
      this.createTrendBaseQuery(workspaceId, since, endDate)
        .leftJoin('t.category', 'c')
        .select("COALESCE(c.name, 'Uncategorized')", 'name')
        .addSelect('COALESCE(SUM(t.debit), 0)', 'amount')
        .addSelect('COUNT(t.id)', 'count')
        .andWhere('t.transactionType = :expense', { expense: TransactionType.EXPENSE })
        .groupBy('c.name')
        .orderBy('amount', 'DESC')
        .limit(10)
        .getRawMany<{ name: string; amount: string; count: string }>(),
      this.createTrendBaseQuery(workspaceId, since, endDate)
        .select('t.counterpartyName', 'name')
        .addSelect('COALESCE(SUM(t.credit), 0)', 'amount')
        .addSelect('COUNT(t.id)', 'count')
        .andWhere('t.transactionType = :income', { income: TransactionType.INCOME })
        .andWhere('t.counterpartyName IS NOT NULL')
        .andWhere("t.counterpartyName != ''")
        .groupBy('t.counterpartyName')
        .orderBy('amount', 'DESC')
        .limit(10)
        .getRawMany<{ name: string; amount: string; count: string }>(),
      this.createTrendBaseQuery(workspaceId, since, endDate)
        .select(
          'COALESCE(SUM(CASE WHEN t.transactionType = :income THEN t.credit ELSE 0 END), 0)',
          'income',
        )
        .addSelect(
          'COALESCE(SUM(CASE WHEN t.transactionType = :expense THEN t.debit ELSE 0 END), 0)',
          'expense',
        )
        .addSelect('COUNT(DISTINCT t.id)', 'rows')
        .setParameter('income', TransactionType.INCOME)
        .setParameter('expense', TransactionType.EXPENSE)
        .getRawOne<{ income: string; expense: string; rows: string }>(),
    ]);

    return { dailyRows, categoryRows, counterpartyRows, sourceRows };
  }

  private createTrendBaseQuery(workspaceId: string, since: Date, endDate: Date) {
    const query = this.transactionRepo.createQueryBuilder('t').innerJoin('t.statement', 's');
    this.applyActiveStatementTransactionFilters(query, workspaceId, since, endDate);
    return query;
  }

  private getTransactionGroupFormat(days: number): string {
    return days >= 90 ? "'IYYY-IW'" : "'YYYY-MM-DD'";
  }

  private applyActiveStatementTransactionFilters(
    query: {
      where: (sql: string, params?: object) => unknown;
      andWhere: (sql: string, params?: object) => unknown;
    },
    workspaceId: string,
    since: Date,
    endDate: Date,
  ) {
    this.applyWorkspaceStatementFilters(query, workspaceId, true);
    query.andWhere('t.transactionDate BETWEEN :since AND :endDate', { since, endDate });
  }

  private applyWorkspaceStatementFilters(
    query: {
      where: (sql: string, params?: object) => unknown;
      andWhere: (sql: string, params?: object) => unknown;
    },
    workspaceId: string,
    excludeDuplicates: boolean,
  ) {
    query.where('s.workspaceId = :workspaceId', { workspaceId });
    query.andWhere('s.deletedAt IS NULL');
    if (excludeDuplicates) {
      query.andWhere('t.isDuplicate = false');
    }
    query.andWhere('s.status NOT IN (:...excludedStatuses)', {
      excludedStatuses: [StatementStatus.ERROR, StatementStatus.PROCESSING],
    });
  }

  private mapNamedAmountCountRows<T extends { name: string; amount: string; count: string }>(rows: T[]) {
    return rows.map(row => ({
      name: row.name,
      amount: Number.parseFloat(row.amount) || 0,
      count: Number.parseInt(row.count, 10) || 0,
    }));
  }
}
