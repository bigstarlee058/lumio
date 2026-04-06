'use client';

import { Alert } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Spinner } from '@/app/components/ui/spinner';
import { type UserSession, getSessionIcon } from '@/app/settings/profile/profileHelpers';
import LogoutIcon from '@mui/icons-material/Logout';

type Props = {
  t: {
    sessionsCard: {
      lastLoginLabel: { value: string };
      logoutAllButton: { value: string };
    };
  };
  tx: (path: string[], fallback: string) => string;
  sessionsMessage: string | null;
  sessionsError: string | null;
  sessionsLoading: boolean;
  sessions: UserSession[];
  userLastLogin: string | null | undefined;
  logoutSessionLoadingId: string | null;
  handleLogoutSession: (session: UserSession) => Promise<void>;
  handleLogoutAll: () => Promise<void>;
};

export function SessionsSection({
  t,
  tx,
  sessionsMessage,
  sessionsError,
  sessionsLoading,
  sessions,
  userLastLogin,
  logoutSessionLoadingId,
  handleLogoutSession,
  handleLogoutAll,
}: Props) {
  return (
    <div className="space-y-5">
      {sessionsMessage && <Alert variant="success">{sessionsMessage}</Alert>}
      {sessionsError && <Alert variant="error">{sessionsError}</Alert>}
      <Alert variant="warning">
        {tx(
          ['sessionsCard', 'securityHint'],
          'Only sign out devices you recognize. Signing out current device ends this session immediately.',
        )}
      </Alert>

      <div className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{t.sessionsCard.lastLoginLabel.value}:</span>{' '}
        {userLastLogin ? new Date(userLastLogin).toLocaleString() : '—'}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-foreground">
          {tx(['sessionsCard', 'activeSessionsLabel'], 'Active devices')}
        </div>

        {sessionsLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border px-4 py-5 text-sm text-muted-foreground">
            <Spinner className="h-[18px] w-[18px] text-inherit" />
            {tx(['sessionsCard', 'loadingLabel'], 'Loading sessions...')}
          </div>
        ) : sessions.length ? (
          <div className="space-y-2">
            {sessions.map(session => {
              const SessionIcon = getSessionIcon(session.device);
              const isLogoutLoading = logoutSessionLoadingId === session.id;

              return (
                <div
                  key={session.id}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-card/60 px-4 py-4 md:flex-row md:items-start md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <SessionIcon className="text-[20px]" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                        <span>{`${session.device} · ${session.browser}`}</span>
                        {session.isCurrent && (
                          <Badge variant="info">
                            {tx(['sessionsCard', 'currentSessionBadge'], 'This device')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {session.os}
                        {session.ipAddress
                          ? ` · ${tx(['sessionsCard', 'ipLabel'], 'IP')}: ${session.ipAddress}`
                          : ''}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tx(['sessionsCard', 'lastActiveLabel'], 'Last active')}:{' '}
                        {new Date(session.lastUsedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant={session.isCurrent ? 'destructive' : 'outline'}
                      onClick={() => handleLogoutSession(session)}
                      disabled={isLogoutLoading}
                      className="gap-2"
                    >
                      {isLogoutLoading && <Spinner className="h-[14px] w-[14px] text-inherit" />}
                      <LogoutIcon className="text-[18px]" />
                      {tx(['sessionsCard', 'logoutSessionButton'], 'Log out')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/60 px-4 py-6 text-sm text-muted-foreground">
            {tx(['sessionsCard', 'emptySessionsLabel'], 'No active sessions found.')}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button variant="destructive" onClick={handleLogoutAll} className="gap-2">
          <LogoutIcon className="text-[18px]" />
          {t.sessionsCard.logoutAllButton.value}
        </Button>
      </div>
    </div>
  );
}
