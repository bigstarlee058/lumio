'use client';

import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { AppLanguage } from '../helpers/navigation-config';

interface Language {
  code: AppLanguage;
  label: string;
  note?: string;
}

interface UseLanguageSelectionParams {
  locale: string;
  availableLocales: unknown[];
  setLocale: (code: AppLanguage) => void;
  languageNames: { ru: { value: string }; en: { value: string }; kk: { value: string } };
  languageModal: { defaultLanguageNote: { value: string }; savedToastPrefix: { value: string } };
  setMobileMenuOpen: (open: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, max-lines-per-function
export function useLanguageSelection({
  locale,
  availableLocales,
  setLocale,
  languageNames,
  languageModal,
  setMobileMenuOpen,
}: UseLanguageSelectionParams) {
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');

  const languages = useMemo(
    (): Language[] =>
      [
        {
          code: 'ru' as const,
          label: languageNames.ru.value,
          note: languageModal.defaultLanguageNote.value,
        },
        { code: 'en' as const, label: languageNames.en.value },
        { code: 'kk' as const, label: languageNames.kk.value },
      ].filter(l => availableLocales.map(String).includes(l.code)),
    [availableLocales, languageModal.defaultLanguageNote, languageNames],
  );

  const normalizedLocale = (locale as AppLanguage) || 'ru';

  const languageLabel = useMemo(() => {
    return languages.find(l => l.code === normalizedLocale)?.label ?? languageNames.ru.value;
  }, [languages, languageNames.ru.value, normalizedLocale]);

  const filteredLanguages = useMemo(() => {
    const query = languageSearch.trim().toLowerCase();
    if (!query) return languages;
    return languages.filter(lang => lang.label.toLowerCase().includes(query));
  }, [languageSearch, languages]);

  const handleLanguageSelect = useCallback(
    (code: AppLanguage) => {
      setLocale(code);
      setLanguageModalOpen(false);
      setLanguageSearch('');
      const selectedLabel = languages.find(l => l.code === code)?.label ?? languageNames.ru.value;
      toast.success(`${languageModal.savedToastPrefix.value}: ${selectedLabel}`);
      setTimeout(() => {
        window.location.reload();
      }, 50);
    },
    [languageModal.savedToastPrefix.value, languageNames.ru.value, languages, setLocale],
  );

  const openLanguageMenu = useCallback(() => {
    setLanguageSearch('');
    setLanguageModalOpen(true);
    setMobileMenuOpen(false);
  }, [setMobileMenuOpen]);

  const closeLanguageMenu = useCallback(() => {
    setLanguageModalOpen(false);
    setLanguageSearch('');
  }, []);

  return {
    languageModalOpen,
    languageSearch,
    setLanguageSearch,
    languages,
    languageLabel,
    normalizedLocale,
    filteredLanguages,
    handleLanguageSelect,
    openLanguageMenu,
    closeLanguageMenu,
  };
}
