import { calculateStringSimilarity } from '@/common/utils/string-similarity.util';

describe('calculateStringSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(calculateStringSimilarity('amazon', 'amazon')).toBe(1);
  });

  it('returns 1 when both strings are empty', () => {
    expect(calculateStringSimilarity('', '')).toBe(1);
  });

  it('returns 0 when only one string is empty', () => {
    expect(calculateStringSimilarity('', 'amazon')).toBe(0);
    expect(calculateStringSimilarity('amazon', '')).toBe(0);
  });

  it('prefers substring matches for merchant-like names', () => {
    expect(calculateStringSimilarity('amazon', 'amazon.com')).toBe(0.8);
  });

  it('treats casing differences as non-identical', () => {
    expect(calculateStringSimilarity('Amazon', 'amazon')).toBeLessThan(1);
  });

  it('keeps unrelated strings below the duplicate threshold', () => {
    expect(calculateStringSimilarity('rent', 'food')).toBeLessThan(0.8);
  });
});
