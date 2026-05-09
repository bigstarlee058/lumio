import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { assertFound } from '../../common/utils/assert-found.util';
import { Budget, BudgetPeriodType } from '../../entities/budget.entity';
import {
  NotificationCategory,
  NotificationSeverity,
  NotificationType,
} from '../../entities/notification.entity';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { Workspace } from '../../entities/workspace.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateBudgetDto } from './dto/create-budget.dto';
import type { UpdateBudgetDto } from './dto/update-budget.dto';

export interface BudgetWithSpending extends Budget {
  limitAmountWorkspace: number;
  spentAmount: number;
  percentUsed: number;
  workspaceCurrency: string;
}

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: Repository<Budget>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly notificationsService: NotificationsService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateBudgetDto): Promise<Budget> {
    const existing = await this.budgetRepository.findOne({
      where: {
        workspaceId,
        categoryId: dto.categoryId,
        periodType: dto.periodType,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Budget for this category with period "${dto.periodType}" already exists`,
      );
    }

    const { start } = this.computePeriodRange(dto.periodType, new Date());

    const budget = this.budgetRepository.create({
      workspaceId,
      createdById: userId,
      name: dto.name,
      categoryId: dto.categoryId,
      limitAmount: dto.limitAmount,
      manualSpentAmount: dto.manualSpentAmount ?? 0,
      currency: dto.currency || 'KZT',
      periodType: dto.periodType,
      currentPeriodStart: start,
    });

    return this.budgetRepository.save(budget);
  }

  async findAll(workspaceId: string): Promise<BudgetWithSpending[]> {
    const budgets = await this.budgetRepository.find({
      where: { workspaceId },
      relations: ['category'],
      order: { name: 'ASC' },
    });

    return Promise.all(budgets.map(budget => this.attachSpending(budget)));
  }

  async findOne(id: string, workspaceId: string): Promise<BudgetWithSpending> {
    const budget = await this.budgetRepository.findOne({
      where: { id, workspaceId },
      relations: ['category'],
    });
    assertFound(budget, 'Budget');
    return this.attachSpending(budget);
  }

  async update(id: string, workspaceId: string, dto: UpdateBudgetDto): Promise<Budget> {
    const budget = await this.budgetRepository.findOne({
      where: { id, workspaceId },
    });
    assertFound(budget, 'Budget');

    const nextCategoryId = dto.categoryId ?? budget.categoryId;
    const nextPeriodType = dto.periodType ?? budget.periodType;
    if (nextCategoryId !== budget.categoryId || nextPeriodType !== budget.periodType) {
      const existing = await this.budgetRepository.findOne({
        where: {
          workspaceId,
          categoryId: nextCategoryId,
          periodType: nextPeriodType,
        },
      });
      if (existing && existing.id !== budget.id) {
        throw new ConflictException(
          `Budget for this category with period "${nextPeriodType}" already exists`,
        );
      }
    }

    Object.assign(budget, dto);
    return this.budgetRepository.save(budget);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const budget = await this.budgetRepository.findOne({
      where: { id, workspaceId },
    });
    assertFound(budget, 'Budget');
    await this.budgetRepository.remove(budget);
  }

  async getTopBudgets(workspaceId: string, limit = 5): Promise<BudgetWithSpending[]> {
    const all = await this.findAll(workspaceId);
    return all.sort((a, b) => b.percentUsed - a.percentUsed).slice(0, limit);
  }

  async checkBudgetAlerts(workspaceId: string, categoryId?: string): Promise<void> {
    const where: FindOptionsWhere<Budget> = { workspaceId };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const budgets = await this.budgetRepository.find({
      where,
      relations: ['category'],
    });

    for (const budget of budgets) {
      await this.resetBudgetForNewPeriodIfNeeded(budget, new Date());
      const { start, end } = this.computePeriodRange(budget.periodType, new Date());
      const workspaceCurrency = await this.getWorkspaceCurrency(workspaceId);
      const limitAmount = await this.convertToWorkspaceCurrency(
        Number(budget.limitAmount),
        budget.currency,
        workspaceCurrency,
      );
      const spentAmount = await this.computeTotalSpending(budget, start, end, workspaceCurrency);
      const percentUsed = limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;

      if (percentUsed >= 100 && !budget.alertAt100Sent) {
        budget.alertAt100Sent = true;
        await this.budgetRepository.save(budget);
        await this.notificationsService.createForWorkspaceMembers({
          workspaceId,
          type: NotificationType.BUDGET_EXCEEDED,
          category: NotificationCategory.WORKSPACE_ACTIVITY,
          severity: NotificationSeverity.ERROR,
          messageKey: 'budget.exceeded',
          messageParams: { budgetName: budget.name, percentUsed: Math.round(percentUsed) },
          entityType: 'budget',
          entityId: budget.id,
          meta: {
            budgetId: budget.id,
            categoryName: budget.category?.name,
            limitAmount,
            spentAmount,
            percentUsed: Math.round(percentUsed),
          },
        });
      } else if (percentUsed >= 80 && !budget.alertAt80Sent) {
        budget.alertAt80Sent = true;
        await this.budgetRepository.save(budget);
        await this.notificationsService.createForWorkspaceMembers({
          workspaceId,
          type: NotificationType.BUDGET_WARNING,
          category: NotificationCategory.WORKSPACE_ACTIVITY,
          severity: NotificationSeverity.WARN,
          messageKey: 'budget.warning',
          messageParams: { budgetName: budget.name, percentUsed: Math.round(percentUsed) },
          entityType: 'budget',
          entityId: budget.id,
          meta: {
            budgetId: budget.id,
            categoryName: budget.category?.name,
            limitAmount,
            spentAmount,
            percentUsed: Math.round(percentUsed),
          },
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetPeriodAlertFlags(): Promise<void> {
    const budgets = await this.budgetRepository.find({
      where: [{ alertAt80Sent: true }, { alertAt100Sent: true }],
    });

    const now = new Date();
    let resetCount = 0;

    for (const budget of budgets) {
      if (await this.resetBudgetForNewPeriodIfNeeded(budget, now)) {
        resetCount++;
      }
    }

    if (resetCount > 0) {
      this.logger.log(`Reset alert flags for ${resetCount} budgets (new period)`);
    }
  }

  private async attachSpending(budget: Budget): Promise<BudgetWithSpending> {
    await this.resetBudgetForNewPeriodIfNeeded(budget, new Date());
    const { start, end } = this.computePeriodRange(budget.periodType, new Date());
    const workspaceCurrency = await this.getWorkspaceCurrency(budget.workspaceId);
    const limitAmount = await this.convertToWorkspaceCurrency(
      Number(budget.limitAmount),
      budget.currency,
      workspaceCurrency,
    );
    const spentAmount = await this.computeTotalSpending(budget, start, end, workspaceCurrency);
    const percentUsed = limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;

    return Object.assign(budget, {
      limitAmountWorkspace: Math.round(limitAmount * 100) / 100,
      spentAmount: Math.round(spentAmount * 100) / 100,
      percentUsed: Math.round(percentUsed * 100) / 100,
      workspaceCurrency,
    });
  }

  private async computeTotalSpending(
    budget: Budget,
    start: Date,
    end: Date,
    workspaceCurrency: string,
  ): Promise<number> {
    const transactionSpent = await this.computeSpending(
      budget.workspaceId,
      budget.categoryId,
      start,
      end,
      workspaceCurrency,
    );
    const manualSpent = await this.convertToWorkspaceCurrency(
      Number(budget.manualSpentAmount ?? 0),
      budget.currency,
      workspaceCurrency,
    );
    return transactionSpent + manualSpent;
  }

  private async computeSpending(
    workspaceId: string,
    categoryId: string,
    start: Date,
    end: Date,
    workspaceCurrency: string,
  ): Promise<number> {
    const rows = await this.transactionRepository
      .createQueryBuilder('t')
      .select('t.currency', 'currency')
      .addSelect('COALESCE(SUM(ABS(t.amount)), 0)', 'total')
      .where('t.workspace_id = :workspaceId', { workspaceId })
      .andWhere('t.category_id = :categoryId', { categoryId })
      .andWhere('t.transaction_type = :type', { type: TransactionType.EXPENSE })
      .andWhere('t.transaction_date >= :start', { start })
      .andWhere('t.transaction_date <= :end', { end })
      .andWhere('t.is_duplicate = false')
      .groupBy('t.currency')
      .getRawMany<{ currency: string | null; total: string }>();

    let total = 0;
    for (const row of rows) {
      total += await this.convertToWorkspaceCurrency(
        Number.parseFloat(row.total ?? '0'),
        row.currency,
        workspaceCurrency,
      );
    }
    return total;
  }

  private async getWorkspaceCurrency(workspaceId: string): Promise<string> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      select: ['currency'],
    });
    return this.normalizeCurrency(workspace?.currency);
  }

  private async convertToWorkspaceCurrency(
    amount: number,
    sourceCurrency: string | null | undefined,
    targetCurrency: string,
  ): Promise<number> {
    if (!Number.isFinite(amount) || amount === 0) {
      return 0;
    }
    const source = this.normalizeCurrency(sourceCurrency);
    if (source === targetCurrency) {
      return amount;
    }
    const rate = await this.exchangeRatesService.getRate(source, targetCurrency);
    return amount * rate;
  }

  private normalizeCurrency(currency: string | null | undefined): string {
    const normalized = String(currency || '')
      .trim()
      .toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) ? normalized : 'KZT';
  }

  private async resetBudgetForNewPeriodIfNeeded(budget: Budget, date: Date): Promise<boolean> {
    const { start } = this.computePeriodRange(budget.periodType, date);
    const currentStart = new Date(budget.currentPeriodStart);

    if (start.getTime() <= currentStart.getTime()) {
      return false;
    }

    budget.currentPeriodStart = start;
    budget.manualSpentAmount = 0;
    budget.alertAt80Sent = false;
    budget.alertAt100Sent = false;
    await this.budgetRepository.save(budget);
    return true;
  }

  private computePeriodRange(periodType: BudgetPeriodType, date: Date): { start: Date; end: Date } {
    const d = new Date(date);

    switch (periodType) {
      case BudgetPeriodType.WEEKLY: {
        const day = d.getDay();
        const diff = day === 0 ? 6 : day - 1; // Monday = 0
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
        return { start, end };
      }
      case BudgetPeriodType.MONTHLY: {
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return { start, end };
      }
      case BudgetPeriodType.QUARTERLY: {
        const quarter = Math.floor(d.getMonth() / 3);
        const start = new Date(d.getFullYear(), quarter * 3, 1);
        const end = new Date(d.getFullYear(), quarter * 3 + 3, 0);
        return { start, end };
      }
      case BudgetPeriodType.ANNUAL: {
        const start = new Date(d.getFullYear(), 0, 1);
        const end = new Date(d.getFullYear(), 11, 31);
        return { start, end };
      }
    }
  }
}
