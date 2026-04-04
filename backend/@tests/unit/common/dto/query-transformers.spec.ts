import {
  toBooleanValue,
  toNumberValue,
  toStringArray,
} from '@/common/dto/query-transformers';

describe('query transformers', () => {
  it('parses numbers and preserves invalid values for validator handling', () => {
    expect(toNumberValue({ value: undefined })).toBeUndefined();
    expect(toNumberValue({ value: '' })).toBeUndefined();
    expect(toNumberValue({ value: '10.5' })).toBe(10.5);
    expect(toNumberValue({ value: 'oops' })).toBe('oops');
  });

  it('parses booleans and preserves invalid values for validator handling', () => {
    expect(toBooleanValue({ value: undefined })).toBeUndefined();
    expect(toBooleanValue({ value: '' })).toBeUndefined();
    expect(toBooleanValue({ value: 'true' })).toBe(true);
    expect(toBooleanValue({ value: 'false' })).toBe(false);
    expect(toBooleanValue({ value: 'maybe' })).toBe('maybe');
  });

  it('normalizes comma-separated strings into arrays', () => {
    expect(toStringArray({ value: undefined })).toBeUndefined();
    expect(toStringArray({ value: '' })).toBeUndefined();
    expect(toStringArray({ value: 'a,b' })).toEqual(['a', 'b']);
    expect(toStringArray({ value: ['a,b', ' c '] })).toEqual(['a', 'b', 'c']);
  });
});
