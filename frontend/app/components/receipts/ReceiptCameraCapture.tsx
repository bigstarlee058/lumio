'use client';

import { Button } from '@/app/components/ui/button';
import { ModalShell } from '@/app/components/ui/modal-shell';
import { receiptsApi } from '@/app/lib/api';
import { Camera, ImageUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useCamera } from './hooks/useCamera';

export interface ReceiptCameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptured?: () => void;
}

export function ReceiptCameraCapture({
  isOpen,
  onClose,
  onCaptured,
}: ReceiptCameraCaptureProps) {
  const { videoRef, startCamera, capturePhoto, stopCamera, error, isCameraAvailable } = useCamera();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    void startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleBlobUpload = async (blob: Blob) => {
    setSubmitting(true);

    try {
      const file = new File([blob], 'receipt-scan.jpg', { type: blob.type || 'image/jpeg' });
      await receiptsApi.scanReceipt(file);
      toast.success('Receipt scan uploaded.');
      onCaptured?.();
      onClose();
    } catch {
      toast.error('Failed to upload receipt scan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCapture = async () => {
    const blob = await capturePhoto();

    if (!blob) {
      toast.error('Capture failed. Try again.');
      return;
    }

    await handleBlobUpload(blob);
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Scan receipt" size="lg">
      <div className="space-y-5">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-[4/3] w-full object-cover"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">Use your camera or choose a photo instead.</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : null}

        {!isCameraAvailable ? (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-primary hover:text-primary">
            <ImageUp className="h-4 w-4" />
            Choose photo
            <input
              type="file"
              className="sr-only"
              accept="image/*"
              capture="environment"
              aria-label="Upload receipt photo"
              onChange={async event => {
                const file = event.target.files?.[0];
                if (file) {
                  await handleBlobUpload(file);
                }
              }}
            />
          </label>
        ) : null}

        <div className="flex justify-center">
          <Button
            size="lg"
            className="min-w-44"
            onClick={() => {
              void handleCapture();
            }}
            disabled={submitting}
            aria-label="Capture photo"
          >
            <Camera className="h-4 w-4" />
            Capture photo
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
