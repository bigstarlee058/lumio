import { Button } from '@/app/components/ui/button';
import type { Meta, StoryObj } from '@storybook/react';
import { Check, Download, Plus, Settings, Trash2 } from '@/app/components/icons';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'ghost', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default state
export const Default: Story = {
  args: {
    children: 'Button',
  },
};

// All variants
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
};

// All sizes
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <Plus size={20} />
      </Button>
    </div>
  ),
};

// With icons
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button>
        <Plus size={16} />
        Добавить
      </Button>
      <Button variant="outline">
        <Download size={16} />
        Скачать
      </Button>
      <Button variant="secondary">
        <Settings size={16} />
        Настройки
      </Button>
      <Button variant="destructive">
        <Trash2 size={16} />
        Удалить
      </Button>
    </div>
  ),
};

// Disabled state
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button disabled>Disabled Default</Button>
      <Button variant="outline" disabled>
        Disabled Outline
      </Button>
      <Button variant="destructive" disabled>
        Disabled Destructive
      </Button>
    </div>
  ),
};

// Loading state (custom implementation)
export const Loading: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button disabled>
        <Spinner className="h-4 w-4" />
        Загрузка...
      </Button>
      <Button variant="outline" disabled>
        <Spinner className="h-4 w-4 text-gray-600" />
        Сохранение...
      </Button>
    </div>
  ),
};

// Icon buttons
export const IconButtons: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="icon" variant="default">
        <Plus size={20} />
      </Button>
      <Button size="icon" variant="outline">
        <Settings size={20} />
      </Button>
      <Button size="icon" variant="ghost">
        <Check size={20} />
      </Button>
      <Button size="icon" variant="destructive">
        <Trash2 size={20} />
      </Button>
    </div>
  ),
};

// Long text
export const LongContent: Story = {
  args: {
    children: 'Очень длинный текст кнопки который может не поместиться',
  },
};
import { Spinner } from '@/app/components/ui/spinner';
