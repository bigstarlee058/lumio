'use client';

import { useCallback, useRef, useState } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraAvailable, setIsCameraAvailable] = useState(true);

  const startCamera = useCallback(async () => {
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setStream(nextStream);
      setIsCameraAvailable(true);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = nextStream;
        try {
          const playResult = videoRef.current.play?.();
          await playResult?.catch(() => undefined);
        } catch {
          // jsdom does not implement HTMLMediaElement.play
        }
      }
    } catch {
      setError('Camera access denied or unavailable');
      setIsCameraAvailable(false);
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 960;

    const context = canvas.getContext('2d');
    context?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob | null>(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92);
    });
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  }, [stream]);

  return {
    videoRef,
    startCamera,
    capturePhoto,
    stopCamera,
    error,
    isCameraAvailable,
  };
}
