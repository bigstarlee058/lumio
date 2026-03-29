import { Receipt } from '@/entities/receipt.entity';
import { ReportHistory } from '@/entities/report-history.entity';
import { getMetadataArgsStorage } from 'typeorm';

describe('Workspace scoping consistency', () => {
  const metadata = getMetadataArgsStorage();

  it.each([
    [Receipt, 'workspace'],
    [ReportHistory, 'workspace'],
  ])('uses cascade delete for %s workspace relation', (entity, propertyName) => {
    const relation = metadata.relations.find(
      entry => entry.target === entity && entry.propertyName === propertyName,
    );

    expect(relation).toBeDefined();
    expect(relation?.options.onDelete).toBe('CASCADE');
  });
});
