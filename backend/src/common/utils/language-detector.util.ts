/**
 * Lightweight language/locale detector using month-name heuristics.
 *
 * Motivation:
 * - Bank statements often include month names even when other text is sparse.
 * - We avoid heavy dependencies; this is deterministic and cheap.
 *
 * Usage:
 *   const { locale, confidence, reason } = detectLocaleFromText(text);
 */
const MONTHS_BY_LOCALE: Record<
  string,
  {
    months: string[];
    aliases?: string[];
  }
> = {
  ru: {
    months: [
      'январ',
      'феврал',
      'март',
      'апрел',
      'мая',
      'июн',
      'июл',
      'август',
      'сентябр',
      'октябр',
      'ноябр',
      'декабр',
    ],
    aliases: ['россия', 'казахстан', 'тенге'],
  },
  kk: {
    months: [
      'қаңтар',
      'ақпан',
      'наурыз',
      'сәуір',
      'мамыр',
      'маусым',
      'шілде',
      'тамыз',
      'қыркүйек',
      'қазан',
      'қараша',
      'желтоқсан',
    ],
    aliases: ['қазақстан', 'теңге'],
  },
  en: {
    months: [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ],
    aliases: ['usd', 'dollar', 'bank'],
  },
  es: {
    months: [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'setiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ],
    aliases: ['banco', 'mxn', 'eur'],
  },
  fr: {
    months: [
      'janvier',
      'février',
      'fevrier',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'aout',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
      'decembre',
    ],
    aliases: ['banque', 'euro'],
  },
  de: {
    months: [
      'januar',
      'februar',
      'märz',
      'maerz',
      'april',
      'mai',
      'juni',
      'juli',
      'august',
      'september',
      'oktober',
      'november',
      'dezember',
    ],
    aliases: ['bank', 'euro'],
  },
  it: {
    months: [
      'gennaio',
      'febbraio',
      'marzo',
      'aprile',
      'maggio',
      'giugno',
      'luglio',
      'agosto',
      'settembre',
      'ottobre',
      'novembre',
      'dicembre',
    ],
    aliases: ['banca', 'euro'],
  },
  pt: {
    months: [
      'janeiro',
      'fevereiro',
      'março',
      'marco',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ],
    aliases: ['banco', 'brl', 'euro'],
  },
  tr: {
    months: [
      'ocak',
      'şubat',
      'subat',
      'mart',
      'nisan',
      'mayıs',
      'mayis',
      'haziran',
      'temmuz',
      'ağustos',
      'agustos',
      'eylül',
      'eylul',
      'ekim',
      'kasım',
      'kasim',
      'aralık',
      'aralik',
    ],
    aliases: ['banka', 'tl'],
  },
};

export type DetectedLocale = {
  locale: string;
  confidence: number; // 0..1
  reason: string;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[\u00a0]/g, ' ')
    .split(/[^a-z\u0400-\u04ff\u00c0-\u017f]+/iu)
    .filter(Boolean);
}

function countMatches(tokens: string[], needles: string[]): number {
  let score = 0;
  for (const token of tokens) {
    for (const needle of needles) {
      if (token.startsWith(needle)) {
        score += 1;
        break;
      }
    }
  }
  return score;
}

export function detectLocaleFromText(text: string): DetectedLocale {
  if (!text?.trim()) {
    return { locale: 'unknown', confidence: 0, reason: 'empty-text' };
  }

  const tokens = tokenize(text);
  let bestLocale = 'unknown';
  let bestScore = 0;
  let bestReason = 'no-match';

  for (const [locale, { months, aliases = [] }] of Object.entries(MONTHS_BY_LOCALE)) {
    const monthScore = countMatches(tokens, months);
    const aliasScore = countMatches(tokens, aliases);
    const totalScore = monthScore * 2 + aliasScore; // months weigh more than aliases

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestLocale = locale;
      bestReason = `months:${monthScore}, aliases:${aliasScore}`;
    }
  }

  // Confidence heuristic: clamp based on hits
  const confidence = Math.max(0, Math.min(1, bestScore / 8));

  return {
    locale: bestLocale,
    confidence,
    reason: bestReason,
  };
}
