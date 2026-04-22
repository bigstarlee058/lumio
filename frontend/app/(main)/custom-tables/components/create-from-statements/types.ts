import type {
  buildStatementSelectionOptions,
  groupStatementSelectionOptions,
} from '../../create-from-statements-utils';
import type { CreateFromStatementsModalLabels, FormatLabelFn } from '../CreateFromStatementsModal';

export type StatementOption = ReturnType<typeof buildStatementSelectionOptions>[number];
export type GroupedOption = ReturnType<typeof groupStatementSelectionOptions>[number];

export interface SelectedStatementSummary {
  selectedCount: number;
  totalRows: number;
}

export interface CreateFromStatementsForm {
  name: string;
  description: string;
}

export type { CreateFromStatementsModalLabels, FormatLabelFn };
