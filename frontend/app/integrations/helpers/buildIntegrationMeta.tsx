'use client';

import type React from 'react';
import { IntegrationIcon } from '../components/IntegrationCard';
import type { IntegrationAction } from '../components/IntegrationCard';

export interface IntegrationMeta {
  key: string;
  name: string;
  description: React.ReactNode;
  badge: React.ReactNode;
  category: string;
  recommended: boolean;
  icon: React.ReactNode;
  actions: IntegrationAction[];
}

interface CardT {
  description: React.ReactNode;
  badge: React.ReactNode;
  actions: { connect?: React.ReactNode; docs?: React.ReactNode; setup?: React.ReactNode; guide?: React.ReactNode };
}

interface IntegrationsT {
  cards: {
    dropbox: CardT;
    googleDrive: CardT;
    googleSheets: CardT;
    telegram: CardT;
  };
}

interface StorageEntryInput {
  key: string;
  name: string;
  card: CardT;
  iconSrc: string;
  docsHref: string;
}

function makeStorageEntry({ key, name, card, iconSrc, docsHref }: StorageEntryInput): IntegrationMeta {
  return {
    key,
    name,
    description: card.description,
    badge: card.badge,
    category: 'storage',
    recommended: true,
    icon: <IntegrationIcon src={iconSrc} alt={name} />,
    actions: [
      { label: card.actions.connect, href: `/integrations/${key}`, primary: true },
      { label: card.actions.docs, href: docsHref, external: true },
    ],
  };
}

function makeDropbox(card: CardT): IntegrationMeta {
  return {
    ...makeStorageEntry({ key: 'dropbox', name: 'Dropbox', card, iconSrc: '/icons/dropbox-icon.png', docsHref: 'https://www.dropbox.com/developers/documentation' }),
    recommended: false,
  };
}

function makeGmail(): IntegrationMeta {
  return {
    key: 'gmail',
    name: 'Gmail',
    description: 'Automatically import receipts and invoices from your Gmail inbox',
    badge: 'Active',
    category: 'email',
    recommended: true,
    icon: <IntegrationIcon src="/icons/gmail.png" alt="Gmail" />,
    actions: [
      { label: 'Connect', href: '/integrations/gmail', primary: true },
      { label: 'Docs', href: 'https://developers.google.com/gmail/api', external: true },
    ],
  };
}

function makeTelegram(card: CardT): IntegrationMeta {
  return {
    key: 'telegram',
    name: 'Telegram',
    description: card.description,
    badge: card.badge,
    category: 'messaging',
    recommended: false,
    icon: <IntegrationIcon src="/icons/icons8-telegram-48.png" alt="Telegram" />,
    actions: [
      { label: card.actions.setup, href: '/settings/telegram', primary: true },
      { label: card.actions.guide, href: 'https://core.telegram.org/bots', external: true },
    ],
  };
}

export function buildIntegrationMeta(t: IntegrationsT): IntegrationMeta[] {
  return [
    makeDropbox(t.cards.dropbox),
    makeStorageEntry({ key: 'google-drive', name: 'Google Drive', card: t.cards.googleDrive, iconSrc: '/icons/google-drive-icon.png', docsHref: 'https://developers.google.com/drive/api/guides/about-sdk' }),
    makeGmail(),
    {
      ...makeStorageEntry({ key: 'google-sheets', name: 'Google Sheets', card: t.cards.googleSheets, iconSrc: '/icons/icons8-google-sheets-48.png', docsHref: 'https://support.google.com/docs' }),
      category: 'spreadsheets',
    },
    makeTelegram(t.cards.telegram),
  ];
}
