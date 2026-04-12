'use client';

import apiClient from '@/app/lib/api';
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { Download, FileSpreadsheet, FileText, FileType2 } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

type ExportFormat = 'excel' | 'pdf' | 'csv' | 'docx';

interface Token {
  value: string;
}

interface ExportDropdownProps {
  t?: Partial<{
    button: Token;
    title: Token;
    excel: Token;
    pdf: Token;
    csv: Token;
    docx: Token;
    downloading: Token;
    success: Token;
    error: Token;
  }>;
}

const EXPORT_ITEMS: Array<{
  key: ExportFormat;
  labelKey: keyof NonNullable<ExportDropdownProps['t']>;
  icon: typeof FileSpreadsheet;
}> = [
  { key: 'excel', labelKey: 'excel', icon: FileSpreadsheet },
  { key: 'pdf', labelKey: 'pdf', icon: FileText },
  { key: 'csv', labelKey: 'csv', icon: FileType2 },
  { key: 'docx', labelKey: 'docx', icon: FileText },
];

export function ExportDropdown({ t }: ExportDropdownProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const text = (token: Token | undefined, fallback: string) => token?.value || fallback;

  const resolveDownloadFileName = (
    format: ExportFormat,
    contentDisposition?: string,
  ) => {
    const fileNameMatch = contentDisposition?.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);

    if (fileNameMatch?.[1]) {
      return decodeURIComponent(fileNameMatch[1].replace(/"/g, ''));
    }

    const extensions: Record<ExportFormat, string> = {
      excel: 'xlsx',
      pdf: 'pdf',
      csv: 'csv',
      docx: 'docx',
    };

    return `workspace-transactions.${extensions[format]}`;
  };

  const handleExport = async (format: ExportFormat) => {
    if (isLoading) {
      return;
    }

    setAnchorEl(null);
    setIsLoading(true);
    const toastId = toast.loading(text(t?.downloading, 'Downloading...'));

    try {
      const response = await apiClient.post(
        '/reports/workspace-export',
        { format },
        { responseType: 'blob' },
      );
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = resolveDownloadFileName(format, response.headers?.['content-disposition']);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(text(t?.success, 'File downloaded successfully'), { id: toastId });
    } catch (error) {
      console.error('Failed to export workspace transactions', error);
      toast.error(text(t?.error, 'Download failed'), { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        disabled={isLoading}
        onClick={event => setAnchorEl(event.currentTarget)}
        startIcon={<Download size={14} style={{ opacity: isLoading ? 0.6 : 1 }} />}
        sx={{
          fontFamily: 'var(--font-dashboard-mono)',
          fontSize: 13,
          fontWeight: 500,
          px: 2.5,
          py: 1.25,
          borderColor: 'var(--border-color)',
          color: 'var(--foreground)',
          '&:hover': { backgroundColor: 'var(--muted)' },
          '&.Mui-disabled': { opacity: 0.6 },
        }}
      >
        {isLoading ? text(t?.downloading, 'Downloading...') : text(t?.button, 'Export')}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        aria-label={text(t?.title, 'Export data')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {EXPORT_ITEMS.map(item => {
          const Icon = item.icon;
          const label = text(
            t?.[item.labelKey] as Token | undefined,
            item.key === 'docx'
              ? 'Word (.docx)'
              : item.key === 'excel'
                ? 'Excel (.xlsx)'
                : item.key.toUpperCase(),
          );
          return (
            <MenuItem
              key={item.key}
              data-testid={`dropdown-item-${item.key}`}
              onClick={() => void handleExport(item.key)}
            >
              <ListItemIcon>
                <Icon size={16} />
              </ListItemIcon>
              <ListItemText>{label}</ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
