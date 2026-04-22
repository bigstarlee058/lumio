'use client';

import type { User } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type RedirectParams = {
  user: User | null | undefined;
  authLoading: boolean;
  currentWorkspace: unknown;
  workspaceLoading: boolean;
};

export function useDashboardRedirect({ user, authLoading, currentWorkspace, workspaceLoading }: RedirectParams): boolean {
  const router = useRouter();
  const needsOnboarding = user?.onboardingCompletedAt == null;

  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (needsOnboarding) { router.replace('/onboarding'); return; }
    if (!currentWorkspace) { router.replace('/workspaces'); }
  }, [authLoading, currentWorkspace, needsOnboarding, router, user, workspaceLoading]);

  return authLoading || workspaceLoading || !user || needsOnboarding || !currentWorkspace;
}
