import { Button } from '@/app/components/ui/button';
import { ModalFooter, ModalShell } from '@/app/components/ui/modal-shell';
import type { Meta, StoryObj } from '@storybook/react';
import { AlertTriangle, CheckCircle, Info } from '@/app/components/icons';
import { useState } from 'react';

const meta: Meta<typeof ModalShell> = {
  title: 'UI/ModalShell',
  component: ModalShell,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive wrapper for stories
const ModalWrapper = ({
  children,
  buttonText = 'Открыть модалку',
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

// Default modal
export const Default: Story = {
  render: () => (
    <ModalWrapper>
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          title="Заголовок модального окна"
          footer={
            <ModalFooter
              onCancel={onClose}
              onConfirm={onClose}
              cancelText="Отмена"
              confirmText="Подтвердить"
            />
          }
        >
          <p className="text-gray-600">
            Это содержимое модального окна. Здесь может быть любой контент.
          </p>
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Size variations
export const Sizes: Story = {
  render: () => {
    const [openSize, setOpenSize] = useState<string | null>(null);
    return (
      <div className="p-8 flex gap-4 flex-wrap">
        {(['sm', 'md', 'lg', 'xl', 'full'] as const).map(size => (
          <Button key={size} onClick={() => setOpenSize(size)}>
            {size.toUpperCase()}
          </Button>
        ))}
        {(['sm', 'md', 'lg', 'xl', 'full'] as const).map(size => (
          <ModalShell
            key={size}
            isOpen={openSize === size}
            onClose={() => setOpenSize(null)}
            title={`Модальное окно размера ${size.toUpperCase()}`}
            size={size}
            footer={<ModalFooter onCancel={() => setOpenSize(null)} />}
          >
            <p>Размер: {size}</p>
          </ModalShell>
        ))}
      </div>
    );
  },
};

// Confirmation dialog
export const ConfirmDialog: Story = {
  render: () => (
    <ModalWrapper buttonText="Удалить">
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="sm"
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-50 text-red-600">
                <AlertTriangle size={20} />
              </div>
              <span>Удалить файл?</span>
            </div>
          }
          footer={
            <ModalFooter
              onCancel={onClose}
              onConfirm={onClose}
              cancelText="Отмена"
              confirmText="Удалить"
              confirmVariant="destructive"
            />
          }
        >
          <p className="text-gray-600">
            Это действие нельзя отменить. Файл будет удалён безвозвратно.
          </p>
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Success modal
export const SuccessModal: Story = {
  render: () => (
    <ModalWrapper buttonText="Показать успех">
      {({ isOpen, onClose }) => (
        <ModalShell isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Успешно!</h3>
            <p className="text-gray-600 mb-6">Операция выполнена успешно.</p>
            <Button onClick={onClose} className="w-full">
              Закрыть
            </Button>
          </div>
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Loading state
export const Loading: Story = {
  render: () => (
    <ModalWrapper buttonText="Сохранить (с загрузкой)">
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          title="Сохранение данных"
          size="sm"
          footer={
            <ModalFooter
              onCancel={onClose}
              onConfirm={() => {}}
              confirmText="Сохранить"
              isConfirmLoading={true}
              isConfirmDisabled={true}
            />
          }
        >
          <p className="text-gray-600">Идёт сохранение ваших данных...</p>
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Long content with scroll
export const LongContent: Story = {
  render: () => (
    <ModalWrapper buttonText="Открыть с длинным контентом">
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          title="Длинное содержимое"
          contentClassName="max-h-[60vh] overflow-y-auto"
          footer={<ModalFooter onCancel={onClose} onConfirm={onClose} />}
        >
          <div className="space-y-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <p key={i} className="text-gray-600">
                Параграф {i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
                quis nostrud exercitation ullamco laboris.
              </p>
            ))}
          </div>
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Info modal
export const InfoModal: Story = {
  render: () => (
    <ModalWrapper buttonText="Показать информацию">
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="md"
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                <Info size={20} />
              </div>
              <span>Информация</span>
            </div>
          }
          footer={<Button onClick={onClose}>Понятно</Button>}
        >
          <div className="space-y-4 text-gray-600">
            <p>Это информационное сообщение с подробностями о функционале.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Первый пункт списка</li>
              <li>Второй пункт списка</li>
              <li>Третий пункт списка</li>
            </ul>
          </div>
        </ModalShell>
      )}
    </ModalWrapper>
  ),
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
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          title="Мобильное окно"
          footer={<ModalFooter onCancel={onClose} onConfirm={onClose} />}
        >
          <p className="text-gray-600">Это модальное окно на мобильном viewport.</p>
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};
