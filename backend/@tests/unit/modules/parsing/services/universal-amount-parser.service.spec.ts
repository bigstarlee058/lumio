import { UniversalAmountParser } from '../../../../../src/modules/parsing/services/universal-amount-parser.service';

describe('UniversalAmountParser', () => {
  let service: UniversalAmountParser;

  beforeEach(() => {
    service = new UniversalAmountParser();
  });

  it('parses European decimal format', async () => {
    await expect(service.parseAmount('1.234,56 €')).resolves.toMatchObject({
      amount: 1234.56,
      currency: 'EUR',
    });
  });

  it('parses Swiss apostrophe thousands separator', async () => {
    await expect(service.parseAmount("CHF 1'234.56")).resolves.toMatchObject({
      amount: 1234.56,
      currency: 'CHF',
    });
  });

  it('parses Indian lakh separators', async () => {
    await expect(service.parseAmount('₹1,23,456.78')).resolves.toMatchObject({
      amount: 123456.78,
      currency: 'INR',
    });
  });

  it('parses Japanese amount without decimals', async () => {
    await expect(service.parseAmount('¥12,345')).resolves.toMatchObject({
      amount: 12345,
    });
  });

  it('parses Arabic-Indic numerals with SAR marker', async () => {
    await expect(service.parseAmount('١٢٣٤٫٥٦ ر.س')).resolves.toMatchObject({
      amount: 1234.56,
      currency: 'SAR',
    });
  });

  it('parses space thousands separator with decimal comma', async () => {
    await expect(service.parseAmount('1 234,56 ₽')).resolves.toMatchObject({
      amount: 1234.56,
      currency: 'RUB',
    });
  });
});
