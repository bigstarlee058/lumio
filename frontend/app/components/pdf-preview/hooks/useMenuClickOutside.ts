import { type RefObject, useEffect, useRef } from 'react';

type MenuParams = { menuOpen: boolean; onClose: () => void };

export function useMenuClickOutside({
  menuOpen,
  onClose,
}: MenuParams): RefObject<HTMLDivElement | null> {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return (): void => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [menuOpen, onClose]);

  return menuRef;
}
