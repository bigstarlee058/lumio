'use client';

import React from 'react';

export type LogoAvatarProps = {
  src: string | null | undefined;
  alt: string;
  size?: number;
  className?: string;
  fallback: React.ReactNode;
  imgClassName?: string;
  fallbackStyle?: React.CSSProperties;
};

export function LogoAvatar({
  src,
  alt,
  size = 32,
  className,
  fallback,
  imgClassName,
  fallbackStyle,
}: LogoAvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={imgClassName}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <span
      role="img"
      className={className}
      style={{ width: size, height: size, ...fallbackStyle }}
      aria-label={alt}
      title={alt}
    >
      {fallback}
    </span>
  );
}
