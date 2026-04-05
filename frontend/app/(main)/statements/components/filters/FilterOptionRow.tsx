'use client';

import { BankLogoAvatar } from '@/app/components/BankLogoAvatar';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import { cn } from '@/app/lib/utils';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { Check, User } from 'lucide-react';

type FilterOptionRowProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
  variant?: 'radio' | 'checkbox';
  className?: string;
  // Avatar props (when provided, renders avatar + optional description)
  description?: string | null;
  avatarUrl?: string | null;
  iconUrl?: string | null;
  bankName?: string | null;
};

export function FilterOptionRow({
  label,
  selected,
  onClick,
  variant = 'radio',
  className,
  description,
  avatarUrl,
  iconUrl,
  bankName,
}: FilterOptionRowProps) {
  const hasAvatar = avatarUrl !== undefined || iconUrl !== undefined || bankName !== undefined;

  if (hasAvatar) {
    const fallbackLetter = label.trim().charAt(0).toUpperCase() || 'U';
    const resolvedAvatarUrl = normalizeAvatarUrl(avatarUrl);
    const normalizedBankName = bankName?.trim().toLowerCase() || null;

    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-gray-50',
          className,
        )}
      >
        <div className="flex items-center gap-3">
          {iconUrl ? (
            <img src={iconUrl} alt={label} className="h-8 w-8 rounded-full object-contain" />
          ) : normalizedBankName === 'receipt' ? (
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500"
              aria-label={label}
              title={label}
            >
              <ReceiptIcon data-testid="receipt-filter-icon" sx={{ fontSize: 24 }} />
            </span>
          ) : bankName ? (
            <BankLogoAvatar bankName={bankName} size={32} />
          ) : resolvedAvatarUrl ? (
            <img
              src={resolvedAvatarUrl}
              alt={label}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
              {fallbackLetter || <User className="h-4 w-4" />}
            </div>
          )}
          <div>
            <div className="text-base font-semibold text-gray-900">{label}</div>
            {description ? <div className="text-sm text-gray-500">{description}</div> : null}
          </div>
        </div>
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md',
            selected ? 'bg-primary text-white' : 'bg-gray-100 text-transparent',
          )}
        >
          {selected && <Check className="h-4 w-4" />}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-left text-base font-semibold text-gray-900 transition hover:bg-gray-50',
        className,
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full',
          selected ? 'bg-primary text-white' : 'bg-gray-100 text-transparent',
          variant === 'checkbox' && 'rounded-md',
        )}
      >
        {selected && <Check className="h-4 w-4" />}
      </span>
    </button>
  );
}
