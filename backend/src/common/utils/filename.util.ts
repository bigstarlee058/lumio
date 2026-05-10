const CYRILLIC_RE = /[\u0400-\u04FF]/;
const MOJIBAKE_HINT_RE = /[ÐÑÃÂ]/;

function scoreCyrillic(value: string): number {
  const matches = value.match(/[\u0400-\u04FF]/g);
  return matches ? matches.length : 0;
}

/**
 * Fixes typical mojibake when UTF-8 bytes were interpreted as latin1/cp1252
 * (e.g. "ÐÑÐ¸Ð¼ÐµÑ.pdf" -> "Пример.pdf").
 */
export function normalizeFilename(input: string): string {
  const name = (input || '').trim();
  if (!name) {
    return name;
  }

  // If it already contains Cyrillic, keep as-is.
  if (CYRILLIC_RE.test(name)) {
    return name;
  }

  // Heuristic: only attempt decoding when it looks like classic UTF-8->latin1 mojibake.
  if (!MOJIBAKE_HINT_RE.test(name)) {
    return name;
  }

  const decoded = Buffer.from(name, 'latin1').toString('utf8').trim();

  // If decoding produced replacement characters, it's likely wrong.
  if (!decoded || decoded.includes('�')) {
    return name;
  }

  // Prefer the version with more Cyrillic characters.
  const decodedCyr = scoreCyrillic(decoded);
  const originalCyr = scoreCyrillic(name);
  if (decodedCyr > originalCyr) {
    return decoded;
  }

  return name;
}
