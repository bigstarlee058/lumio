'use client';

import apiClient from '@/app/lib/api';
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react';
import { Download, FileSpreadsheet, FileText, FileType2 } from 'lucide-react';
import { useState } from 'react';
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
    <Dropdown>
      <DropdownTrigger>
        <button
          type="button"
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          <Download size={14} className={isLoading ? 'animate-pulse' : undefined} />
          <span
            className="text-[13px] font-medium"
            style={{ fontFamily: 'var(--font-dashboard-mono)' }}
          >
            {isLoading ? text(t?.downloading, 'Downloading...') : text(t?.button, 'Export')}
          </span>
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={text(t?.title, 'Export data')}
        onAction={key => handleExport(key as ExportFormat)}
      >
        {EXPORT_ITEMS.map(item => {
          const Icon = item.icon;

          return (
            <DropdownItem key={item.key} startContent={<Icon size={16} />}>
              {text(t?.[item.labelKey] as Token | undefined, item.key === 'docx' ? 'Word (.docx)' : item.key === 'excel' ? 'Excel (.xlsx)' : item.key.toUpperCase())}
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </Dropdown>
  );
}
