'use client';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';

interface CustomDatePickerProps {
  value?: string | null;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  containerTestId?: string;
}

const DATE_VALUE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeToDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  if (DATE_VALUE_REGEX.test(value)) {
    const d = parseISO(value);
    return isValid(d) ? d : null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export default function CustomDatePicker({
  value,
  onChange,
  label,
  placeholder,
  helperText,
  containerTestId,
}: CustomDatePickerProps) {
  const dateValue = normalizeToDate(value);

  const handleChange = (date: Date | null) => {
    if (date && isValid(date)) {
      onChange(format(date, 'yyyy-MM-dd'));
    } else {
      onChange('');
    }
  };

  return (
    <div data-testid={containerTestId}>
      <DatePicker
        label={label}
        value={dateValue}
        onChange={handleChange}
        slotProps={{
          textField: {
            fullWidth: true,
            size: 'small',
            helperText: helperText,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            placeholder: placeholder,
          } as any,
        }}
      />
    </div>
  );
}
