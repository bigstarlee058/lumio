import { UniversalDateParser } from '@/modules/parsing/services/universal-date-parser.service';

describe('UniversalDateParser', () => {
  let service: UniversalDateParser;

  beforeEach(() => {
    service = new UniversalDateParser();
  });

  it('parses duplicated structured date formats consistently', async () => {
    await expect(service.parseDate('2026-04-04')).resolves.toMatchObject({
      format: 'ISO8601',
      confidence: 0.95,
      date: new Date(2026, 3, 4),
    });

    await expect(service.parseDate('20260404')).resolves.toMatchObject({
      format: 'NUMERIC',
      confidence: 0.9,
      date: new Date(2026, 3, 4),
    });

    await expect(service.parseDate('04.04.2026')).resolves.toMatchObject({
      format: 'DOTTED',
      confidence: 0.8,
      date: new Date(2026, 3, 4),
    });
  });
});
