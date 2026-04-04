import type { ColumnInconsistency } from './column-validation.service';

export interface FieldValidationState<T = unknown> {
  inconsistencies: ColumnInconsistency[];
  isValid: boolean;
  correctedValue: T;
}

export function createFieldValidationState<T>(value: T): FieldValidationState<T> {
  return {
    inconsistencies: [],
    isValid: true,
    correctedValue: value,
  };
}
