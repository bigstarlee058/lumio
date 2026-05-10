/** Formats a numeric percentage value with sign prefix, e.g. +12.5% or -3%. */
export const formatPercentage = (value: number): string => {
  const normalized = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  if (value > 0) {
    return `+${normalized}%`;
  }
  return `${normalized}%`;
};
