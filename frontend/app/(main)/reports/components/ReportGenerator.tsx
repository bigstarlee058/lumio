'use client';

import { useIntlayer } from '@/app/i18n';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Download, X } from 'lucide-react';
import { useState } from 'react';
import type { ReportTemplate } from './ReportTemplateCard';

export interface ReportGenerateParams {
  templateId: string;
  dateFrom: string;
  dateTo: string;
  format: 'pdf' | 'excel' | 'csv';
}

interface ReportGeneratorProps {
  template: ReportTemplate;
  onClose: () => void;
  onGenerate: (params: ReportGenerateParams) => Promise<void>;
}

const FORMAT_OPTIONS: Array<{ value: 'pdf' | 'excel' | 'csv'; label: string }> = [
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'csv', label: 'CSV (.csv)' },
];

export function ReportGenerator({ template, onClose, onGenerate }: ReportGeneratorProps) {
  const t = useIntlayer('reportsPage');
  const labels = t.labels as Record<string, { value?: string } | undefined>;
  const text = (key: string, fallback: string) => labels[key]?.value ?? fallback;

  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('excel');
  const [generating, setGenerating] = useState(false);

  const availableFormats = FORMAT_OPTIONS.filter(opt =>
    template.formats.includes(opt.value as 'pdf' | 'excel' | 'csv' | 'google-sheets'),
  );

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate({ templateId: template.id, dateFrom, dateTo, format });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Paper
      elevation={0}
      data-tour-id="reports-generator"
      sx={{
        mt: 3,
        borderRadius: 0,
        border: '1px solid var(--border)',
        bgcolor: 'var(--card)',
        p: 3,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
        <Box>
          <Typography variant="body1" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
            {template.name}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.25, color: 'var(--muted-foreground)' }}>
            {template.description}
          </Typography>
        </Box>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--muted-foreground)',
          }}
        >
          <X size={16} />
        </button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 2.5,
        }}
      >
        {/* Date from */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <label
            htmlFor="date-from"
            style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}
          >
            {text('dateFrom', 'Date from')}
          </label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={{
              height: 36,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              padding: '0 12px',
              fontSize: 14,
              color: 'var(--foreground)',
              outline: 'none',
              borderRadius: 0,
            }}
          />
        </Box>

        {/* Date to */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <label
            htmlFor="date-to"
            style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}
          >
            {text('dateTo', 'Date to')}
          </label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            style={{
              height: 36,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              padding: '0 12px',
              fontSize: 14,
              color: 'var(--foreground)',
              outline: 'none',
              borderRadius: 0,
            }}
          />
        </Box>

        {/* Format */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>
            {text('format', 'Format')}
          </span>
          <Box sx={{ display: 'flex', gap: 1 }} data-tour-id="reports-format">
            {availableFormats.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormat(opt.value)}
                style={{
                  flex: 1,
                  height: 36,
                  border: format === opt.value ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: format === opt.value ? 'var(--primary)' : 'var(--card)',
                  color: format === opt.value ? '#fff' : 'var(--muted-foreground)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 0,
                  textTransform: 'uppercase',
                }}
              >
                {opt.value.toUpperCase()}
              </button>
            ))}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={generating}
          startIcon={generating ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <Download size={16} />}
          data-tour-id="reports-generate-button"
        >
          {generating ? text('generating', 'Generating…') : text('generateAndDownload', 'Generate & Download')}
        </Button>
        <Button variant="text" onClick={onClose} disabled={generating}>
          {text('cancel', 'Cancel')}
        </Button>
      </Box>
    </Paper>
  );
}
