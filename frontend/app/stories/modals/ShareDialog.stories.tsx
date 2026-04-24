import { Button } from '@/app/components/ui/button';
import { ModalShell } from '@/app/components/ui/modal-shell';
import type { Meta, StoryObj } from '@storybook/react';
import { Check, Copy, Trash2 } from '@/app/components/icons';
import { useState } from 'react';

/**
 * ShareDialogContent - Pure presentational component for share links management
 * Extracted from ShareDialog for Storybook testing without API dependencies
 */
interface SharedLink {
  id: string;
  token: string;
  permission: 'view' | 'download' | 'edit';
  expiresAt: string | null;
  description: string | null;
  status: 'active' | 'expired';
  accessCount: number;
  createdAt: string;
}

interface ShareDialogContentProps {
  sharedLinks: SharedLink[];
  onCopyLink?: (token: string) => void;
  onDeleteLink?: (linkId: string) => void;
  copiedToken?: string | null;
}

function ShareDialogContent({
  sharedLinks,
  onCopyLink,
  onDeleteLink,
  copiedToken,
}: ShareDialogContentProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'view':
        return 'Просмотр';
      case 'download':
        return 'Скачивание';
      case 'edit':
        return 'Редактирование';
      default:
        return permission;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активна';
      case 'expired':
        return 'Истекла';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Активные ссылки ({sharedLinks.length})
      </h3>

      {sharedLinks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Нет активных ссылок</p>
          <p className="text-sm mt-1">Создайте ссылку для совместного доступа</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sharedLinks.map(link => (
            <div key={link.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {getPermissionLabel(link.permission)}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    link.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {getStatusLabel(link.status)}
                </span>
                {link.expiresAt && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    до {formatDate(link.expiresAt)}
                  </span>
                )}
              </div>

              {link.description && <p className="text-sm text-gray-600 mb-2">{link.description}</p>}

              <p className="text-xs text-gray-500">
                Создана: {formatDate(link.createdAt)} • Просмотров: {link.accessCount}
              </p>

              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => onCopyLink?.(link.token)}
                  className={`p-2 rounded-lg transition-colors ${
                    copiedToken === link.token
                      ? 'text-green-600 bg-green-50'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Копировать ссылку"
                >
                  {copiedToken === link.token ? <Check size={18} /> : <Copy size={18} />}
                </button>
                <button
                  onClick={() => onDeleteLink?.(link.id)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Удалить ссылку"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Story meta
const meta: Meta<typeof ShareDialogContent> = {
  title: 'Modals/ShareDialog',
  component: ShareDialogContent,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive wrapper
const ModalWrapper = ({
  children,
  buttonText = 'Поделиться',
}: {
  children: (props: { isOpen: boolean; onClose: () => void }) => React.ReactNode;
  buttonText?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>{buttonText}</Button>
      {children({ isOpen, onClose: () => setIsOpen(false) })}
    </div>
  );
};

// Mock data
const mockLinks: SharedLink[] = [
  {
    id: 'link-1',
    token: 'abc123def456',
    permission: 'view',
    expiresAt: '2024-02-15T00:00:00Z',
    description: 'Ссылка для бухгалтерии',
    status: 'active',
    accessCount: 12,
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'link-2',
    token: 'xyz789ghi012',
    permission: 'download',
    expiresAt: null,
    description: null,
    status: 'active',
    accessCount: 5,
    createdAt: '2024-01-10T14:20:00Z',
  },
];

// Default with links
export const Default: Story = {
  render: () => {
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    return (
      <ModalWrapper>
        {({ isOpen, onClose }) => (
          <ModalShell isOpen={isOpen} onClose={onClose} title="Совместный доступ" size="md">
            <ShareDialogContent
              sharedLinks={mockLinks}
              copiedToken={copiedToken}
              onCopyLink={token => {
                setCopiedToken(token);
                setTimeout(() => setCopiedToken(null), 2000);
              }}
              onDeleteLink={id => alert(`Delete link: ${id}`)}
            />
          </ModalShell>
        )}
      </ModalWrapper>
    );
  },
};

// Empty state
export const Empty: Story = {
  render: () => (
    <ModalWrapper buttonText="Поделиться (пусто)">
      {({ isOpen, onClose }) => (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Совместный доступ" size="md">
          <ShareDialogContent sharedLinks={[]} />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Many links (scroll)
export const ManyLinks: Story = {
  render: () => {
    const manyLinks: SharedLink[] = Array.from({ length: 10 }, (_, i) => ({
      id: `link-${i}`,
      token: `token${i}abc123`,
      permission: (['view', 'download', 'edit'] as const)[i % 3],
      expiresAt: i % 2 === 0 ? '2024-02-15T00:00:00Z' : null,
      description: i % 3 === 0 ? `Ссылка для отдела ${i + 1}` : null,
      status: i < 8 ? 'active' : 'expired',
      accessCount: Math.floor(Math.random() * 100),
      createdAt: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
    }));

    return (
      <ModalWrapper buttonText="Поделиться (много ссылок)">
        {({ isOpen, onClose }) => (
          <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Совместный доступ"
            size="md"
            contentClassName="max-h-[60vh] overflow-y-auto"
          >
            <ShareDialogContent
              sharedLinks={manyLinks}
              onCopyLink={token => alert(`Copied: ${token}`)}
              onDeleteLink={id => alert(`Delete: ${id}`)}
            />
          </ModalShell>
        )}
      </ModalWrapper>
    );
  },
};

// With expired link
export const WithExpiredLink: Story = {
  render: () => {
    const linksWithExpired: SharedLink[] = [
      ...mockLinks,
      {
        id: 'link-3',
        token: 'expired123',
        permission: 'view',
        expiresAt: '2024-01-01T00:00:00Z',
        description: 'Старая ссылка',
        status: 'expired',
        accessCount: 50,
        createdAt: '2023-12-15T10:30:00Z',
      },
    ];

    return (
      <ModalWrapper buttonText="Поделиться (с истёкшей)">
        {({ isOpen, onClose }) => (
          <ModalShell isOpen={isOpen} onClose={onClose} title="Совместный доступ" size="md">
            <ShareDialogContent
              sharedLinks={linksWithExpired}
              onCopyLink={token => alert(`Copied: ${token}`)}
              onDeleteLink={id => alert(`Delete: ${id}`)}
            />
          </ModalShell>
        )}
      </ModalWrapper>
    );
  },
};

// Mobile viewport
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
  render: () => (
    <ModalWrapper>
      {({ isOpen, onClose }) => (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Совместный доступ" size="sm">
          <ShareDialogContent
            sharedLinks={mockLinks}
            onCopyLink={token => alert(`Copied: ${token}`)}
            onDeleteLink={id => alert(`Delete: ${id}`)}
          />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};
