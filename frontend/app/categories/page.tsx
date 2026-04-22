'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CategoriesPageRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workspaces/categories');
  }, [router]);

  return null;
}
