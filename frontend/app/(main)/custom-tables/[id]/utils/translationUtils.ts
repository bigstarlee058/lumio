interface GetTranslationValueParams {
  root: unknown;
  path: string[];
  fallback?: string;
}

type Obj = Record<string, unknown>;

function resolveSegment(current: unknown, segment: string): unknown {
  if (typeof current !== 'object' || current === null) {
    return undefined;
  }
  if (!(segment in (current as Obj))) {
    return undefined;
  }
  return (current as Obj)[segment];
}

function extractStringValue(current: unknown, fallback: string): string {
  if (typeof current === 'string') {
    return current;
  }
  if (typeof current !== 'object' || current === null || !('value' in (current as Obj))) {
    return fallback;
  }
  const value = (current as { value?: unknown }).value;
  return typeof value === 'string' ? value : fallback;
}

export function getTranslationValue({
  root,
  path,
  fallback = '',
}: GetTranslationValueParams): string {
  let current: unknown = root;
  for (const segment of path) {
    const next = resolveSegment(current, segment);
    if (next === undefined) {
      return fallback;
    }
    current = next;
  }
  return extractStringValue(current, fallback);
}
