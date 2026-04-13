'use client';

type FilterSectionProps = {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export function FilterSection({ title, children, style }: FilterSectionProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</div>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
      </div>
    </section>
  );
}
