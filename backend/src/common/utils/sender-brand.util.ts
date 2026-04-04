import { isLikelySentence } from './receipt-text.util';

const SENDER_SUFFIX_PATTERN =
  /\s+(support|billing|payments?|service|team|notifications?|no[-\s]?reply)$/i;

export function extractBrandFromSender(sender?: string): string | undefined {
  if (!sender) {
    return undefined;
  }

  const displayName = sender.split('<')[0]?.trim().replace(/^"|"$/g, '');
  if (displayName && !displayName.includes('@')) {
    const cleanedDisplayName = displayName.replace(SENDER_SUFFIX_PATTERN, '').trim();

    if (cleanedDisplayName && !isLikelySentence(cleanedDisplayName)) {
      return cleanedDisplayName.slice(0, 100);
    }

    return displayName.slice(0, 100);
  }

  const emailMatch = sender.match(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/i);
  const domain = emailMatch?.[1];
  if (!domain) {
    return undefined;
  }

  const rootDomain = domain.split('.')[0] || '';
  if (!rootDomain) {
    return undefined;
  }

  return `${rootDomain.charAt(0).toUpperCase()}${rootDomain.slice(1).toLowerCase()}`;
}
