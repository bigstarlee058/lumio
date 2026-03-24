'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: 'financial' | 'operational' | 'tax';
  formats: Array<'pdf' | 'excel' | 'csv' | 'google-sheets'>;
}

interface ReportTemplateCardProps {
  template: ReportTemplate;
  onSelect: (template: ReportTemplate) => void;
  isSelected?: boolean;
}

export function ReportTemplateCard({ template, onSelect, isSelected }: ReportTemplateCardProps) {
  return (
    <Card
      className={`group cursor-pointer rounded-[20px] border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-card ${
        isSelected
          ? 'border-primary/40 ring-2 ring-primary/20 shadow-md'
          : 'hover:border-primary/20'
      }`}
      onClick={() => onSelect(template)}
    >
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <template.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight">{template.name}</h3>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{template.description}</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {template.formats.map(f => (
            <span
              key={f}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground"
            >
              {f}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
