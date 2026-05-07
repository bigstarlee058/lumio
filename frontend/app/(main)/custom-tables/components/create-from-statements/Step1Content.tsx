'use client';

import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import type { StatementGroupBy } from '../../create-from-statements-utils';
import { StatementGroup } from './StatementGroup';
import type {
  CreateFromStatementsModalLabels,
  FormatLabelFn,
  GroupedOption,
  SelectedStatementSummary,
  StatementOption,
} from './types';

interface Step1FiltersProps {
  statementsSearchQuery: string;
  statementsSourceFilter: string;
  statementsGroupBy: StatementGroupBy;
  statementSourceOptions: string[];
  labels: CreateFromStatementsModalLabels;
  onSearchChange: (query: string) => void;
  onSourceFilterChange: (source: string) => void;
  onGroupByChange: (groupBy: StatementGroupBy) => void;
}

function Step1Filters({
  statementsSearchQuery,
  statementsSourceFilter,
  statementsGroupBy,
  statementSourceOptions,
  labels,
  onSearchChange,
  onSourceFilterChange,
  onGroupByChange,
}: Step1FiltersProps): React.JSX.Element {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={labels.searchPlaceholder}
          value={statementsSearchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel>{labels.sourceFilter}</InputLabel>
          <Select
            value={statementsSourceFilter}
            label={labels.sourceFilter}
            onChange={e => onSourceFilterChange(e.target.value)}
          >
            {statementSourceOptions.map(opt => (
              <MenuItem key={opt} value={opt}>
                {opt === 'all' ? labels.sourceAll : opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel>{labels.groupBy}</InputLabel>
          <Select
            value={statementsGroupBy}
            label={labels.groupBy}
            onChange={e => onGroupByChange(e.target.value as StatementGroupBy)}
          >
            <MenuItem value="source">{labels.groupBySource}</MenuItem>
            <MenuItem value="period">{labels.groupByPeriod}</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
}

interface StatementListProps {
  statementsLoading: boolean;
  statementSelectionOptions: StatementOption[];
  groupedStatementSelectionOptions: GroupedOption[];
  selectedStatementIds: string[];
  labels: CreateFromStatementsModalLabels;
  formatLabel: FormatLabelFn;
  onToggleStatement: (params: { representativeId: string; checked: boolean }) => void;
}

function StatementList({
  statementsLoading,
  statementSelectionOptions,
  groupedStatementSelectionOptions,
  selectedStatementIds,
  labels,
  formatLabel,
  onToggleStatement,
}: StatementListProps): React.JSX.Element {
  return (
    <Box
      sx={{
        maxHeight: 360,
        overflowY: 'auto',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        p: 1,
      }}
    >
      {statementsLoading ? (
        <Typography variant="caption">{labels.statementsLoading}</Typography>
      ) : statementSelectionOptions.length === 0 ? (
        <Typography variant="caption">{labels.statementsEmpty}</Typography>
      ) : groupedStatementSelectionOptions.length === 0 ? (
        <Typography variant="caption">{labels.noSearchResults}</Typography>
      ) : (
        groupedStatementSelectionOptions.map(group => (
          <StatementGroup
            key={group.key}
            group={group}
            selectedStatementIds={selectedStatementIds}
            labels={labels}
            formatLabel={formatLabel}
            onToggleStatement={onToggleStatement}
          />
        ))
      )}
    </Box>
  );
}

export interface Step1ContentProps {
  statementsSearchQuery: string;
  statementsSourceFilter: string;
  statementsGroupBy: StatementGroupBy;
  statementSourceOptions: string[];
  statementsLoading: boolean;
  statementSelectionOptions: StatementOption[];
  groupedStatementSelectionOptions: GroupedOption[];
  selectedStatementIds: string[];
  selectedStatementSummary: SelectedStatementSummary;
  labels: CreateFromStatementsModalLabels;
  formatLabel: FormatLabelFn;
  onSearchChange: (query: string) => void;
  onSourceFilterChange: (source: string) => void;
  onGroupByChange: (groupBy: StatementGroupBy) => void;
  onToggleStatement: (params: { representativeId: string; checked: boolean }) => void;
}

export function Step1Content({
  statementsSearchQuery,
  statementsSourceFilter,
  statementsGroupBy,
  statementSourceOptions,
  statementsLoading,
  statementSelectionOptions,
  groupedStatementSelectionOptions,
  selectedStatementIds,
  selectedStatementSummary,
  labels,
  formatLabel,
  onSearchChange,
  onSourceFilterChange,
  onGroupByChange,
  onToggleStatement,
}: Step1ContentProps): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {labels.step1Description}
      </Typography>
      <Step1Filters
        statementsSearchQuery={statementsSearchQuery}
        statementsSourceFilter={statementsSourceFilter}
        statementsGroupBy={statementsGroupBy}
        statementSourceOptions={statementSourceOptions}
        labels={labels}
        onSearchChange={onSearchChange}
        onSourceFilterChange={onSourceFilterChange}
        onGroupByChange={onGroupByChange}
      />
      <StatementList
        statementsLoading={statementsLoading}
        statementSelectionOptions={statementSelectionOptions}
        groupedStatementSelectionOptions={groupedStatementSelectionOptions}
        selectedStatementIds={selectedStatementIds}
        labels={labels}
        formatLabel={formatLabel}
        onToggleStatement={onToggleStatement}
      />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--muted-foreground)',
        }}
      >
        <span>{labels.hint}</span>
        <span>
          {formatLabel({
            template: labels.selectedLabel,
            values: { count: selectedStatementSummary.selectedCount },
          })}
        </span>
      </Box>
    </Box>
  );
}
