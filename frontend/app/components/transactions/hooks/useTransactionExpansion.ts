import type React from 'react';
import { useCallback, useState } from 'react';

interface UseTransactionExpansionResult {
  expandedIds: Set<string>;
  toggleExpansion: (id: string) => (e: React.SyntheticEvent) => void;
}

export function useTransactionExpansion(): UseTransactionExpansionResult {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpansion = useCallback(
    (id: string) =>
      (e: React.SyntheticEvent): void => {
        e.stopPropagation();
        setExpandedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
      },
    [],
  );

  return { expandedIds, toggleExpansion };
}
