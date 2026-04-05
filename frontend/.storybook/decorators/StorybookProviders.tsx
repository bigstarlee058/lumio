'use client';

import React, { createContext, useContext } from 'react';

// Mock locale context
const MockLocaleContext = createContext({
  locale: 'ru' as string,
  setLocale: (_locale: string) => {},
  availableLocales: ['ru', 'en', 'kk'] as string[],
});

// Mock translation helper - returns proxy that returns value with .value accessor
type MockTranslationTree = {
  value: string;
  [key: string]: MockTranslationTree | string;
};

const createMockTranslations = (prefix: string) => {
  return new Proxy({ value: prefix } as MockTranslationTree, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') {
        return undefined;
      }

      if (prop === 'value') {
        return prefix;
      }

      // Return another proxy for nested access
      return createMockTranslations(`${prefix}.${prop}`);
    },
  });
};

// Mock useIntlayer hook
export const useIntlayer = (namespace: string) => {
  return createMockTranslations(namespace);
};

// Mock useLocale hook
export const useLocale = () => {
  const context = useContext(MockLocaleContext);
  return context;
};

// Mock auth context
interface MockUser {
  id: string;
  email: string;
  name: string;
}

const MockAuthContext = createContext<{
  user: MockUser | null;
  logout: () => void;
}>({
  user: {
    id: 'mock-user-1',
    email: 'user@example.com',
    name: 'Test User',
  },
  logout: () => {},
});

export const useAuth = () => {
  return useContext(MockAuthContext);
};

// Mock permissions
export const usePermissions = () => ({
  isAdmin: true,
  hasPermission: (_permission: string) => true,
});

interface StorybookProvidersProps {
  children: React.ReactNode;
  locale?: string;
  user?: MockUser | null;
}

export function StorybookProviders({
  children,
  locale = 'ru',
  user = { id: 'mock-user-1', email: 'user@example.com', name: 'Test User' },
}: StorybookProvidersProps) {
  return (
    <MockLocaleContext.Provider
      value={{
        locale,
        setLocale: () => {},
        availableLocales: ['ru', 'en', 'kk'],
      }}
    >
      <MockAuthContext.Provider value={{ user, logout: () => {} }}>
        <div className="font-sans antialiased">{children}</div>
      </MockAuthContext.Provider>
    </MockLocaleContext.Provider>
  );
}

// Re-export for stories that need to override
export { MockLocaleContext, MockAuthContext };
