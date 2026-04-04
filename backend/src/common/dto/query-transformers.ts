export const toStringArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const items = (Array.isArray(value) ? value : [value])
    .flatMap(item => String(item).split(','))
    .map(item => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
};

export const toNumberValue = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

export const toBooleanValue = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
};
