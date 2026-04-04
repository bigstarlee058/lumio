import { createFieldValidationState } from '@/modules/parsing/services/column-validation.util';

describe('column-validation.util', () => {
  it('creates an editable validation state from the original value', () => {
    expect(createFieldValidationState('123')).toEqual({
      inconsistencies: [],
      isValid: true,
      correctedValue: '123',
    });
  });
});
