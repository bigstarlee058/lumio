'use client';

import { Spinner } from '@/app/components/ui/spinner';
import { getWorkspaceHeaders } from '@/app/lib/workspace-headers';
import { AlertCircle, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PDFThumbnailProps {
  fileId: string;
  fileName?: string;
  source?: 'statement' | 'gmail' | 'receipt';
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  errorMessage?: string;
  preservePageAspect?: boolean;
}

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api/v1' : '/api/v1')
).replace(/\/$/, '');
const DEFAULT_THUMBNAIL_WIDTH = 200;
const MIN_THUMBNAIL_WIDTH = 80;
const MAX_THUMBNAIL_WIDTH = 1600;

const thumbnailCache = new Map<string, string>();

export function PDFThumbnail({
  fileId,
  fileName,
  source = 'statement',
  size = 40,
  width,
  height,
  className = '',
  errorMessage,
  preservePageAspect = false,
}: PDFThumbnailProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const requestedWidth = Math.max(
    MIN_THUMBNAIL_WIDTH,
    Math.min(MAX_THUMBNAIL_WIDTH, Math.round(width ?? DEFAULT_THUMBNAIL_WIDTH)),
  );

  const frameWidth = width ?? size;
  const maxFrameHeight = height ?? size;
  const resolvedFrameHeight =
    preservePageAspect && imageAspectRatio
      ? Math.min(maxFrameHeight, Math.round(frameWidth / imageAspectRatio))
      : maxFrameHeight;

  useEffect(() => {
    if (!thumbnailDataUrl || !preservePageAspect) {
      setImageAspectRatio(null);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        return;
      }
      setImageAspectRatio(image.naturalWidth / image.naturalHeight);
    };
    image.onerror = () => {
      if (!cancelled) {
        setImageAspectRatio(null);
      }
    };
    image.src = thumbnailDataUrl;

    return () => {
      cancelled = true;
    };
  }, [thumbnailDataUrl, preservePageAspect]);

  useEffect(() => {
    let isMounted = true;
    const cacheKey = `${source}:${fileId}:${requestedWidth}`;

    const fetchThumbnail = async () => {
      // Check in-memory cache first
      if (thumbnailCache.has(cacheKey)) {
        const cached = thumbnailCache.get(cacheKey);
        if (isMounted) {
          if (cached) {
            setThumbnailDataUrl(cached);
          } else {
            setError(true);
          }
          setLoading(false);
        }
        return;
      }

      try {
        const headers = getWorkspaceHeaders();

        if (!headers.Authorization) {
          setError(true);
          setLoading(false);
          return;
        }

        const thumbnailUrl =
          source === 'gmail'
            ? `${apiBaseUrl}/integrations/gmail/receipts/${fileId}/thumbnail?width=${requestedWidth}`
            : source === 'receipt'
              ? `${apiBaseUrl}/integrations/gmail/receipts/${fileId}/thumbnail?width=${requestedWidth}`
            : `${apiBaseUrl}/statements/${fileId}/thumbnail?width=${requestedWidth}`;

        const response = await fetch(thumbnailUrl, {
          method: 'GET',
          headers,
          credentials: 'include',
          cache: 'default',
        });

        if (!response.ok) {
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
          return;
        }

        const blob = await response.blob();

        // Convert Blob to Base64 Data URL for safe caching
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          thumbnailCache.set(cacheKey, base64data);
          if (isMounted) {
            setThumbnailDataUrl(base64data);
            setLoading(false);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchThumbnail();

    return () => {
      isMounted = false;
    };
  }, [fileId, source, requestedWidth]);

  // If error occurred, show default PDF icon
  if (error) {
    const fallbackIconSize = Math.max(14, Math.round(size * 0.8));
    const frameHeight = maxFrameHeight;

    if (errorMessage) {
      return (
        <div
          style={{
            width: frameWidth,
            height: frameHeight,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            backgroundColor: '#fff',
            padding: 16,
            textAlign: 'center',
          }}
        >
          <AlertCircle data-testid="pdf-thumbnail-error-icon" size={24} style={{ color: '#9ca3af' }} />
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{errorMessage}</p>
        </div>
      );
    }

    return (
      <div
        style={{
          width: frameWidth,
          height: frameHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FileText
          data-testid="pdf-thumbnail-fallback-icon"
          size={fallbackIconSize}
          style={{ color: '#9ca3af' }}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="pdf-thumbnail-frame"
      style={{
        position: 'relative',
        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
        borderRadius: 12,
        overflow: 'hidden',
        width: frameWidth,
        height: resolvedFrameHeight,
      }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spinner size={16} sx={{ color: '#4b5563' }} />
        </div>
      )}
      {thumbnailDataUrl && (
        <img
          src={thumbnailDataUrl}
          alt={fileName || 'PDF thumbnail'}
          className={className}
          style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'opacity 0.2s' }}
        />
      )}
    </div>
  );
}
