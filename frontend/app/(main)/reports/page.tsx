'use client';

import { useIntlayer } from '@/app/i18n';
import apiClient from '@/app/lib/api';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { BarChart3, DollarSign, PieChart, Scale } from 'lucide-react';
import { useState } from 'react';
import BalanceSheet from './components/BalanceSheet';
import { type ReportGenerateParams, ReportGenerator } from './components/ReportGenerator';
import { ReportHistory } from './components/ReportHistory';
import { type ReportTemplate, ReportTemplateCard } from './components/ReportTemplateCard';

export default function ReportsPage() {
  const t = useIntlayer('reportsPage');
  const labels = t.labels as Record<string, { value?: string } | undefined>;
  const text = (key: string, fallback: string) => labels[key]?.value ?? fallback;

  const templates: ReportTemplate[] = [
    {
      id: 'pnl',
      name: text('templatePnlName', 'Profit & Loss (P&L)'),
      description: text(
        'templatePnlDescription',
        'Income and expenses summary with net profit for a period',
      ),
      icon: DollarSign,
      category: 'financial',
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'balance-sheet',
      name: text('templateBalanceName', 'Balance Sheet'),
      description: text('templateBalanceDescription', 'Assets, liabilities and equity snapshot'),
      icon: Scale,
      category: 'financial',
      formats: ['pdf', 'excel'],
    },
    {
      id: 'cash-flow',
      name: text('templateCashFlowName', 'Cash Flow Statement'),
      description: text('templateCashFlowDescription', 'Cash inflows and outflows over a period'),
      icon: BarChart3,
      category: 'financial',
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'expense-by-category',
      name: text('templateExpenseByCategoryName', 'Expense by Category'),
      description: text(
        'templateExpenseByCategoryDescription',
        'Breakdown of expenses by category with totals',
      ),
      icon: PieChart,
      category: 'operational',
      formats: ['pdf', 'excel', 'csv'],
    },
  ];

  const [tab, setTab] = useState<'templates' | 'history'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [showBalanceSheet, setShowBalanceSheet] = useState(false);

  const handleSelectTemplate = (template: ReportTemplate) => {
    if (template.id === 'balance-sheet') {
      setShowBalanceSheet(true);
      setSelectedTemplate(null);
      return;
    }
    setSelectedTemplate(prev => (prev?.id === template.id ? null : template));
  };

  const handleGenerate = async (params: ReportGenerateParams) => {
    const response = await apiClient.post('/reports/generate', params, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${params.templateId}-report.${params.format === 'excel' ? 'xlsx' : params.format}`;
    a.click();
    window.URL.revokeObjectURL(url);
    setSelectedTemplate(null);
  };

  if (showBalanceSheet) {
    return (
      <Box sx={{ minHeight: '100vh' }}>
        <Box sx={{ px: 4, pt: 4, pb: 3 }}>
          <button
            type="button"
            onClick={() => setShowBalanceSheet(false)}
            style={{ marginBottom: 16, fontSize: 14, fontWeight: 500, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← {text('backToTemplates', 'Back to templates')}
          </button>
          <Typography variant="h5" fontWeight={700}>
            {text('balanceSheetTitle', 'Balance Sheet')}
          </Typography>
        </Box>
        <Box sx={{ px: 4, pb: 4 }}>
          <BalanceSheet />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Box sx={{ px: 4, pt: 4, pb: 0 }}>
        <Typography variant="h5" fontWeight={700}>
          {text('title', 'Reports')}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: 'var(--muted-foreground)' }}>
          {text('subtitle', 'Generate financial reports and export documents')}
        </Typography>
      </Box>

      <Box sx={{ mt: 2, borderBottom: '1px solid var(--border)', px: 4 }}>
        <Tabs
          data-tour-id="reports-tabs"
          value={tab}
          onChange={(_e, v: 'templates' | 'history') => {
            setTab(v);
            setSelectedTemplate(null);
          }}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              minHeight: 48,
              '&.Mui-selected': { color: 'var(--primary)' },
            },
            '& .MuiTabs-indicator': { backgroundColor: 'var(--primary)' },
          }}
        >
          <Tab value="templates" label={text('tabTemplates', 'Templates')} />
          <Tab
            value="history"
            label={text('tabHistory', 'History')}
            data-tour-id="reports-history-tab"
          />
        </Tabs>
      </Box>

      <Box sx={{ px: 4, py: 3 }}>
        {tab === 'templates' && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 2,
              }}
              data-tour-id="reports-templates-grid"
            >
              {templates.map(tmpl => (
                <ReportTemplateCard
                  key={tmpl.id}
                  template={tmpl}
                  onSelect={handleSelectTemplate}
                  isSelected={selectedTemplate?.id === tmpl.id}
                />
              ))}
            </Box>
            {selectedTemplate && (
              <ReportGenerator
                template={selectedTemplate}
                onClose={() => setSelectedTemplate(null)}
                onGenerate={handleGenerate}
              />
            )}
          </>
        )}
        {tab === 'history' && <ReportHistory />}
      </Box>
    </Box>
  );
}
