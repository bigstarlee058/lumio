'use client';

import apiClient from '@/app/lib/api';
import { syncLocaleFromUser } from '@/app/lib/locale';
import { DEFAULT_APP_ROUTE } from '@/app/lib/default-app-route';
import { Spinner } from '@/app/components/ui/spinner';
import { Box } from '@mui/material';
import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

type GoogleAuthButtonProps = {
  inviteToken?: string | null;
  nextPath?: string | null;
  onError: (message: string) => void;
  errorFallback: string;
};

export function GoogleAuthButton({
  inviteToken,
  nextPath,
  onError,
  errorFallback,
}: GoogleAuthButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
    }
  }, []);

  const handleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      const credential = response?.credential;
      if (!credential) {
        onError(errorFallback);
        return;
      }

      onError('');
      setSigningIn(true);

      try {
        const result = await apiClient.post('/auth/google', {
          credential,
          invitationToken: inviteToken || undefined,
        });

        const { access_token, refresh_token, user } = result.data;

        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        syncLocaleFromUser(user);
        if (user.workspaceId) {
          localStorage.setItem('currentWorkspaceId', user.workspaceId);
        }

        if (!inviteToken && user?.onboardingCompletedAt == null) {
          window.location.href = '/onboarding';
          return;
        }

        window.location.href = nextPath || DEFAULT_APP_ROUTE;
      } catch (error) {
        const message =
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof error.response === 'object' &&
          error.response !== null &&
          'data' in error.response &&
          typeof error.response.data === 'object' &&
          error.response.data !== null
            ? (((error.response.data as { message?: string }).message ||
                (error.response.data as { error?: { message?: string } }).error?.message) ??
              errorFallback)
            : errorFallback;
        onError(message);
      } finally {
        setSigningIn(false);
      }
    },
    [errorFallback, inviteToken, nextPath, onError],
  );

  const renderGoogleButton = useCallback(() => {
    if (!scriptLoaded || !clientId || !buttonRef.current) return;
    const google = window.google;
    if (!google?.accounts?.id) return;

    buttonRef.current.innerHTML = '';
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 320,
      logo_alignment: 'left',
    });
  }, [clientId, handleCredentialResponse, scriptLoaded]);

  useEffect(() => {
    renderGoogleButton();
  }, [renderGoogleButton]);

  if (!clientId) {
    return null;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box ref={buttonRef} />
      </Box>
      {signingIn && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mt: 1,
          }}
        >
          <Spinner size={16} />
        </Box>
      )}
    </Box>
  );
}
