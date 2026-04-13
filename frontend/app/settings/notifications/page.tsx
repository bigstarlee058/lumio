'use client';

import Box from '@mui/material/Box';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NotificationSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/profile#notifications');
  }, [router]);

  return <Box className="container-shared" sx={{ py: 3 }} />;
}
