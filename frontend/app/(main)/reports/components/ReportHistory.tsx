'use client';

import { Badge } from '@/app/components/ui/badge';
import { Spinner } from '@/app/components/ui/spinner';
import { useIntlayer, useLocale } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import { Download, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ReportHistoryItem {
  id: string;
  templateId: string;
  templateName: string;
  dateFrom: string;
  dateTo: string;
  format: string;
  generatedBy: string;
  generatedAt: string;
  downloadUrl: string;
  fileName?: string;
  fileSize: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FORMAT_BADGE_CLASSES: Record<string, string> = {
  excel: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pdf: 'bg-rose-100 text-rose-700 border-rose-200',
  csv: 'bg-sky-100 text-sky-700 border-sky-200',
};

export function ReportHistory() {
  const t = useIntlayer('reportsPage');
  const { locale } = useLocale();
  const labels = t.labels as Record<string, { value?: string } | undefined>;
  const text = (key: string, fallback: string) => labels[key]?.value ?? fallback;
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const getRelativeTime = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return text('justNow', 'Just now');
    if (diffMins < 60) return `${diffMins}${text('minutesAgo', 'm ago')}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}${text('hoursAgo', 'h ago')}`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return text('yesterday', 'Yesterday');
    if (diffDays < 7) return `${diffDays} ${text('daysAgo', 'days ago')}`;

    const resolvedLocale = locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-RU' : 'en-US';
    return date.toLocaleDateString(resolvedLocale, { month: 'short', day: 'numeric' });
  };

  const handleDownload = async (item: ReportHistoryItem) => {
    const response = await apiClient.get(`/reports/history/${item.id}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const extension = item.format === 'excel' ? 'xlsx' : item.format;
    link.download =
      item.fileName || `${item.templateId}-${item.dateFrom}-${item.dateTo}.${extension}`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    apiClient
      .get('/reports/history')
      .then(res => setHistory(res.data?.data || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <FileText className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-semibold text-muted-foreground">
          {text('historyEmpty', 'No reports generated yet')}
        </p>
        <p className="text-xs text-muted-foreground/80">
          {text('historyEmptyHint', 'Select a template and generate your first report.')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/60">
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {text('historyReport', 'Report')}
            </th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {text('historyPeriod', 'Period')}
            </th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {text('historyFormat', 'Format')}
            </th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {text('historyGenerated', 'Generated')}
            </th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {text('historySize', 'Size')}
            </th>
            <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {text('historyDownload', 'Download')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {history.map(item => (
            <tr key={item.id} className="transition-colors hover:bg-muted/50">
              <td className="px-5 py-3.5">
                <span className="font-medium text-foreground">{item.templateName}</span>
              </td>
              <td className="px-5 py-3.5 text-xs text-muted-foreground">
                {item.dateFrom} – {item.dateTo}
              </td>
              <td className="px-5 py-3.5">
                <Badge
                  className={`text-[10px] font-semibold uppercase border px-2 py-0.5 ${FORMAT_BADGE_CLASSES[item.format] ?? 'bg-slate-100 text-slate-600'}`}
                >
                  {item.format}
                </Badge>
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap text-xs text-muted-foreground">
                {getRelativeTime(item.generatedAt)}
              </td>
              <td className="px-5 py-3.5 text-xs text-muted-foreground/80">
                {formatFileSize(item.fileSize)}
              </td>
              <td className="px-5 py-3.5 text-right">
                <button
                  type="button"
                  onClick={() => void handleDownload(item)}
                  aria-label={`Re-download ${item.templateName}`}
                  title={`Re-download ${item.templateName}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <Download className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
