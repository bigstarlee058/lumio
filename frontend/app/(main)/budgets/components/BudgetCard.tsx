'use client';

import { Pencil, Trash2, Wallet } from '@/app/components/icons';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import type React from 'react';
import type { BudgetItem } from '../hooks/useBudgetsPage';

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

function getProgressColor(percent: number): 'success' | 'warning' | 'error' {
  if (percent >= 100) {
    return 'error';
  }
  if (percent >= 80) {
    return 'warning';
  }
  return 'success';
}

function formatAmount({ amount, currency }: { amount: number; currency: string }): string {
  return `${new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)} ${currency}`;
}

function getDisplayCurrency(budget: BudgetItem): string {
  return budget.workspaceCurrency ?? budget.currency;
}

function getDisplayLimitAmount(budget: BudgetItem): number {
  return budget.limitAmountWorkspace ?? budget.limitAmount;
}

interface BudgetCardProps {
  budget: BudgetItem;
  onEdit: (budget: BudgetItem) => void;
  onUpdateSpent: (budget: BudgetItem) => void;
  onDelete: (id: string) => void;
}

function BudgetCardHeader({ budget }: { budget: BudgetItem }): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={600} noWrap>
          {budget.name}
        </Typography>
        <Typography variant="h6" fontWeight={700} color="primary">
          {formatAmount({
            amount: getDisplayLimitAmount(budget),
            currency: getDisplayCurrency(budget),
          })}
          <Typography component="span" variant="body2" color="text.secondary">
            {' '}
            limit
          </Typography>
        </Typography>
      </Box>
      <Chip label={PERIOD_LABELS[budget.periodType]} size="small" variant="outlined" />
    </Box>
  );
}

function BudgetProgress({ budget }: { budget: BudgetItem }): React.ReactElement {
  const color = getProgressColor(budget.percentUsed);
  const progressValue = Math.min(budget.percentUsed, 100);

  return (
    <>
      <LinearProgress
        variant="determinate"
        value={progressValue}
        color={color}
        sx={{ height: 8, borderRadius: '3px', mb: 1 }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {formatAmount({ amount: budget.spentAmount, currency: getDisplayCurrency(budget) })} spent
        </Typography>
        <Typography variant="body2" fontWeight={600} color={`${color}.main`}>
          {Math.round(budget.percentUsed)}%
        </Typography>
      </Box>
    </>
  );
}

function BudgetActions({
  budget,
  onEdit,
  onUpdateSpent,
  onDelete,
}: BudgetCardProps): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <IconButton size="small" onClick={() => onUpdateSpent(budget)} aria-label="Update spending">
        <Wallet size={16} />
      </IconButton>
      <IconButton size="small" onClick={() => onEdit(budget)} aria-label="Edit budget">
        <Pencil size={16} />
      </IconButton>
      <IconButton
        size="small"
        color="error"
        onClick={() => onDelete(budget.id)}
        aria-label="Delete budget"
      >
        <Trash2 size={16} />
      </IconButton>
    </Box>
  );
}

export function BudgetCard(props: BudgetCardProps): React.ReactElement {
  const { budget } = props;

  return (
    <Card variant="outlined" sx={{ position: 'relative' }}>
      <CardContent sx={{ pb: 1.5, '&:last-child': { pb: 1.5 } }}>
        <BudgetCardHeader budget={budget} />
        <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {budget.category?.name ?? 'Unknown category'}
          </Typography>
        </Box>
        <BudgetProgress budget={budget} />
        <BudgetActions {...props} />
      </CardContent>
    </Card>
  );
}
