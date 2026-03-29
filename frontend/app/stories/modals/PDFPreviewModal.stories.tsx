import { Button } from '@/app/components/ui/button';
import { ModalShell } from '@/app/components/ui/modal-shell';
import type { Meta, StoryObj } from '@storybook/react';
import { Download, ExternalLink, Printer, X } from 'lucide-react';
import { useState } from 'react';

/**
 * PDFPreviewModalContent - Pure presentational component for PDF preview
 * Extracted from PDFPreviewModal for Storybook testing without API dependencies
 */
interface PDFPreviewContentProps {
  fileName: string;
  pdfUrl: string | null;
  isLoading: boolean;
  error: string | null;
  onDownload?: () => void;
  onPrint?: () => void;
  onOpenInNewTab?: () => void;
  onClose: () => void;
}

function PDFPreviewContent({
  fileName,
  pdfUrl,
  isLoading,
  error,
  onDownload,
  onPrint,
  onOpenInNewTab,
  onClose,
}: PDFPreviewContentProps) {
  return (
    <div className="flex flex-col h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 truncate">{fileName}</h2>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onDownload}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Скачать"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onPrint}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Печать"
            disabled={!pdfUrl}
          >
            <Printer size={20} />
          </button>
          <button
            onClick={onOpenInNewTab}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Открыть в новой вкладке"
            disabled={!pdfUrl}
          >
            <ExternalLink size={20} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Закрыть"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Spinner className="mx-auto mb-4 h-12 w-12 text-blue-600" />
              <p className="text-gray-600">Загрузка документа...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X size={32} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ошибка загрузки</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={onClose}>Закрыть</Button>
            </div>
          </div>
        )}

        {!isLoading && !error && pdfUrl && (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg">
              <div className="w-24 h-32 bg-gray-100 rounded border-2 border-gray-300 mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-xs">PDF</span>
              </div>
              <p className="text-gray-600 text-sm">
                PDF-просмотрщик (в Storybook отображается заглушка)
              </p>
              <p className="text-gray-400 text-xs mt-2">URL: {pdfUrl}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Story meta
const meta: Meta<typeof PDFPreviewContent> = {
  title: 'Modals/PDFPreviewModal',
  component: PDFPreviewContent,
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
  buttonText = 'Просмотреть PDF',
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

// Default - loaded PDF
export const Default: Story = {
  render: () => (
    <ModalWrapper>
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="xl"
          showCloseButton={false}
          contentClassName="p-0"
        >
          <PDFPreviewContent
            fileName="bank_statement_2024_01.pdf"
            pdfUrl="blob:http://localhost/mock-pdf-url"
            isLoading={false}
            error={null}
            onDownload={() => alert('Download clicked')}
            onPrint={() => alert('Print clicked')}
            onOpenInNewTab={() => alert('Open in new tab clicked')}
            onClose={onClose}
          />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Loading state
export const Loading: Story = {
  render: () => (
    <ModalWrapper buttonText="Открыть (загрузка)">
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="xl"
          showCloseButton={false}
          contentClassName="p-0"
        >
          <PDFPreviewContent
            fileName="bank_statement_2024_01.pdf"
            pdfUrl={null}
            isLoading={true}
            error={null}
            onClose={onClose}
          />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Error state
export const Error: Story = {
  render: () => (
    <ModalWrapper buttonText="Открыть (ошибка)">
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="xl"
          showCloseButton={false}
          contentClassName="p-0"
        >
          <PDFPreviewContent
            fileName="bank_statement_2024_01.pdf"
            pdfUrl={null}
            isLoading={false}
            error="Ошибка загрузки файла: 404 Not Found. Файл не найден или был удалён."
            onClose={onClose}
          />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Authorization error
export const AuthError: Story = {
  render: () => (
    <ModalWrapper buttonText="Открыть (нет авторизации)">
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="xl"
          showCloseButton={false}
          contentClassName="p-0"
        >
          <PDFPreviewContent
            fileName="secure_document.pdf"
            pdfUrl={null}
            isLoading={false}
            error="Необходима авторизация. Пожалуйста, войдите в систему."
            onClose={onClose}
          />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};

// Long filename
export const LongFilename: Story = {
  render: () => (
    <ModalWrapper buttonText="Открыть (длинное имя)">
      {({ isOpen, onClose }) => (
        <ModalShell
          isOpen={isOpen}
          onClose={onClose}
          size="xl"
          showCloseButton={false}
          contentClassName="p-0"
        >
          <PDFPreviewContent
            fileName="very_long_bank_statement_filename_january_2024_halyk_bank_account_statement_with_all_transactions_complete_version_final.pdf"
            pdfUrl="blob:http://localhost/mock-pdf-url"
            isLoading={false}
            error={null}
            onDownload={() => alert('Download clicked')}
            onPrint={() => alert('Print clicked')}
            onOpenInNewTab={() => alert('Open in new tab clicked')}
            onClose={onClose}
          />
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
          size="full"
          showCloseButton={false}
          contentClassName="p-0"
        >
          <PDFPreviewContent
            fileName="bank_statement.pdf"
            pdfUrl="blob:http://localhost/mock-pdf-url"
            isLoading={false}
            error={null}
            onDownload={() => alert('Download clicked')}
            onClose={onClose}
          />
        </ModalShell>
      )}
    </ModalWrapper>
  ),
};
import { Spinner } from '@/app/components/ui/spinner';
