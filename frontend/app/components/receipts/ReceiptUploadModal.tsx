'use client';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { ModalShell } from '@/app/components/ui/modal-shell';
import { Select } from '@/app/components/ui/select';
import { cn } from '@/app/lib/utils';
import { FileImage, FileText, UploadCloud, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useReceiptUpload } from './hooks/useReceiptUpload';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'application/pdf',
]);

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'eng', label: 'English' },
  { value: 'deu', label: 'German' },
  { value: 'fra', label: 'French' },
  { value: 'spa', label: 'Spanish' },
  { value: 'rus', label: 'Russian' },
  { value: 'jpn', label: 'Japanese' },
  { value: 'ara', label: 'Arabic' },
];

export interface ReceiptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: () => void;
}

export function ReceiptUploadModal({ isOpen, onClose, onUploaded }: ReceiptUploadModalProps) {
  const { uploadReceipts, uploading, progress, error } = useReceiptUpload();
  const [files, setFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState('auto');
  const [localError, setLocalError] = useState<string | null>(null);

  const visibleError = localError ?? error;

  const uploadLabel = useMemo(() => {
    if (files.length === 1) {
      return 'Upload 1 receipt';
    }

    return `Upload ${files.length} receipts`;
  }, [files.length]);

  const resetState = () => {
    setFiles([]);
    setLanguage('auto');
    setLocalError(null);
  };

  const validateAndStoreFiles = (incomingFiles: File[]) => {
    const nextFiles = incomingFiles.slice(0, 5);

    if (nextFiles.some(file => !ACCEPTED_TYPES.has(file.type))) {
      setLocalError('Only JPG, PNG, WEBP, BMP, TIFF, and PDF files are supported.');
      return;
    }

    if (nextFiles.some(file => file.size > MAX_FILE_SIZE)) {
      setLocalError('Each file must be 10 MB or smaller.');
      return;
    }

    setLocalError(null);
    setFiles(nextFiles);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setLocalError('Select at least one receipt to upload.');
      return;
    }

    try {
      await uploadReceipts(files, language);
      toast.success('Receipts uploaded and queued for processing.');
      resetState();
      onClose();
      onUploaded?.();
    } catch {
      // handled by hook state
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="Upload receipts"
      size="lg"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              resetState();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || files.length === 0}>
            {uploadLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Card className="border-dashed border-slate-300 bg-slate-50/80 shadow-none">
          <CardContent className="p-0">
            <label
              htmlFor="receipt-upload-input"
              className="flex cursor-pointer flex-col items-center gap-3 px-6 py-10 text-center"
            >
              <div className="rounded-full bg-white p-4 text-primary shadow-sm">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  Drop receipt images or PDFs here
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Up to 5 files, 10 MB each. JPG, PNG, WEBP, BMP, TIFF, and PDF supported.
                </p>
              </div>
            </label>
            <Input
              id="receipt-upload-input"
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff,application/pdf"
              multiple
              aria-label="Select receipt files"
              onChange={event => {
                validateAndStoreFiles(Array.from(event.target.files ?? []));
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-2">
          <label htmlFor="receipt-language" className="text-sm font-medium text-slate-700">
            OCR language
          </label>
          <Select
            id="receipt-language"
            aria-label="OCR language"
            value={language}
            onChange={event => setLanguage(event.target.value)}
          >
            {LANGUAGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {visibleError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {visibleError}
          </div>
        ) : null}

        {uploading ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            Uploading... {progress}%
          </div>
        ) : null}

        {files.length > 0 ? (
          <div className="space-y-2">
            {files.map(file => {
              const isPdf = file.type === 'application/pdf';
              return (
                <div
                  key={`${file.name}-${file.size}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-full bg-slate-100 p-2 text-slate-600">
                      {isPdf ? <FileText className="h-4 w-4" /> : <FileImage className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    className={cn(
                      'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors',
                      'hover:bg-slate-100 hover:text-slate-700',
                    )}
                    onClick={() => {
                      setFiles(currentFiles =>
                        currentFiles.filter(currentFile => currentFile !== file),
                      );
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}
