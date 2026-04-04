import {
  isAddressLike,
  isDateRangeLike,
  isLikelySentence,
  isYearLikeAmount,
  shouldSkipLineItem,
} from '@/common/utils/receipt-text.util';

describe('receipt-text utilities', () => {
  it('detects sentence-like descriptions', () => {
    expect(isLikelySentence('Thanks for your purchase!')).toBe(true);
    expect(isLikelySentence('GitHub Actions')).toBe(false);
  });

  it('detects date-range-like descriptions', () => {
    expect(isDateRangeLike('Feb 27, 2026-Mar 15,2026')).toBe(true);
    expect(isDateRangeLike('GitHub Actions')).toBe(false);
  });

  it('detects address-like descriptions', () => {
    expect(isAddressLike('San Francisco, CA 94107')).toBe(true);
    expect(isAddressLike('GitHub Actions')).toBe(false);
  });

  it('treats year-like amounts without currency as suspicious', () => {
    expect(isYearLikeAmount(2026, false)).toBe(true);
    expect(isYearLikeAmount(2026, true)).toBe(false);
  });

  it('combines the guards for line-item filtering', () => {
    expect(shouldSkipLineItem('Thanks for your purchase!', 202.0, false)).toBe(true);
    expect(shouldSkipLineItem('GitHub Actions', 10.0, false)).toBe(false);
  });
});
