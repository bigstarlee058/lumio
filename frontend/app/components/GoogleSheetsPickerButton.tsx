'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { pickSpreadsheet } from '@/app/lib/googleSheetsPicker';
import type { SpreadsheetSelection } from '@/app/lib/googleSheetsSelection';
import MuiButton from '@mui/material/Button';
import { useState } from 'react';

type Props = {
  accessToken: string;
  apiKey: string;
  disabled?: boolean;
  onPick: (selection: SpreadsheetSelection) => Promise<void> | void;
  onError: (message: string) => void;
  label: string;
  loadingLabel: string;
};

export function GoogleSheetsPickerButton({
  accessToken,
  apiKey,
  disabled,
  onPick,
  onError,
  label,
  loadingLabel,
}: Props) {
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (error: unknown) => {
    if (!error || typeof error !== 'object') return 'Google Picker is unavailable';
    return (error as { message?: string }).message || 'Google Picker is unavailable';
  };

  const handleClick = async () => {
    if (!accessToken || !apiKey || disabled) return;

    try {
      setLoading(true);
      const selection = await pickSpreadsheet({ accessToken, apiKey });
      if (!selection) return;
      await onPick(selection);
    } catch (error: unknown) {
      onError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MuiButton
      variant="outlined"
      color="primary"
      size="small"
      disabled={disabled || loading || !accessToken || !apiKey}
      onClick={handleClick}
      startIcon={loading ? <Spinner style={{ width: 16, height: 16 }} /> : null}
    >
      {loading ? loadingLabel : label}
    </MuiButton>
  );
}
