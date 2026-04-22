const AVATAR_COLORS = [
  '#4f46e5', // brand indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#e11d48', // rose
  '#06b6d4', // cyan
  '#84cc16', // lime
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getInitials(label: string): string {
  if (!label) return '?';
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(label: string): string {
  const index = hashString(label) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] ?? '#4f46e5';
}
