'use client';

import { NotificationDropdown } from '@/app/components/NotificationDropdown';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import apiClient from '@/app/lib/api';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import { getRecord, resolveLabel } from '@/app/lib/side-panel-utils';
import {
  THEME_STORAGE_EVENT,
  type ThemePreference,
  getScheduledTheme,
  getStoredThemePreference,
  getStoredThemeTimeZone,
  resolveThemePreference,
} from '@/app/lib/theme-preference';
import { TourMenu } from '@/app/tours/components/TourMenu';
import { type DriveStep, driver } from 'driver.js';
import 'driver.js/dist/driver.css';

import { useIntlayer, useLocale } from '@/app/i18n';
import { Divider, ListItemIcon, ListItemText, Menu as MuiMenu, MenuItem } from '@mui/material';
import {
  BarChart2,
  BookOpen,
  Building2,
  Check,
  ChevronLeft,
  Clock3,
  FileText,
  Globe,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PlayCircle,
  Plug,
  Search,
  Settings,
  Sun,
  Table,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import '@/app/styles/blocks/lumio-navigation.css';
import { useTheme } from 'next-themes';
import { Nunito } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { DEFAULT_APP_ROUTE } from '../lib/default-app-route';
import { canAccessWorkspaceActivity } from '../lib/workspace-activity-access';

const nunito = Nunito({ subsets: ['latin'], weight: ['800', '900'] });

const MOBILE_MENU_VISIBILITY_EVENT = 'lumio-mobile-menu-visibility';

type AppLanguage = 'ru' | 'en' | 'kk';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, setUser } = useAuth();
  const normalizedAvatarUrl = normalizeAvatarUrl(user?.avatarUrl);
  const { isAdmin, hasPermission } = usePermissions();
  const { currentWorkspace } = useWorkspace();
  const { locale, availableLocales, setLocale } = useLocale();
  const { setTheme } = useTheme();
  const {
    nav,
    userMenu,
    languageModal,
    languages: languageNames,
    tour,
  } = useIntlayer('navigation');
  const trashLabel = resolveLabel(getRecord(userMenu)?.trash, 'Trash');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuMounted, setMobileMenuMounted] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');
  const [portalReady, setPortalReady] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>(() =>
    getStoredThemePreference(),
  );
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);
  const userMenuOpen = Boolean(userMenuAnchorEl);
  const isMobile = useIsMobile();

  useLockBodyScroll(languageModalOpen || mobileMenuOpen);

  const getText = useCallback((token: unknown) => resolveLabel(token, ''), []);

  type PopoverType = NonNullable<DriveStep['popover']>;

  const buildTourSteps = useCallback<() => DriveStep[]>(() => {
    if (typeof document === 'undefined') {
      return [];
    }

    const isElementVisible = (element: Element) => {
      const rect = element.getClientRects();
      if (!rect.length) return false;
      const style = window.getComputedStyle(element as HTMLElement);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };

    type TourCandidate = {
      selector: string;
      title: string;
      description: string;
      side?: PopoverType['side'];
      align?: PopoverType['align'];
    };

    const candidates: TourCandidate[] = [
      {
        selector: '[data-tour-id="brand"]',
        title: getText(tour.steps.brand.title),
        description: getText(tour.steps.brand.description),
        side: 'bottom',
        align: 'start',
      },
      {
        selector: '[data-tour-id="primary-nav"]',
        title: getText(tour.steps.navigation.title),
        description: getText(tour.steps.navigation.description),
        side: 'bottom',
        align: 'start',
      },

      {
        selector: '[data-tour-id="user-menu-trigger"]',
        title: getText(tour.steps.userMenu.title),
        description: getText(tour.steps.userMenu.description),
        side: 'bottom',
        align: 'end',
      },
    ];

    if (isMobile) {
      candidates.splice(1, 0, {
        selector: '[data-tour-id="mobile-menu-toggle"]',
        title: getText(tour.steps.mobileMenu.title),
        description: getText(tour.steps.mobileMenu.description),
        side: 'bottom',
        align: 'end',
      });
    }

    return candidates.flatMap<DriveStep>(candidate => {
      const element = document.querySelector(candidate.selector);
      if (!element || !isElementVisible(element)) {
        return [];
      }

      return [
        {
          element,
          popover: {
            title: candidate.title,
            description: candidate.description,
            side: candidate.side ?? 'bottom',
            align: candidate.align ?? 'start',
          },
        },
      ];
    });
  }, [getText, tour]);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuMounted(true);
      const frame = window.requestAnimationFrame(() => {
        setMobileMenuVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    if (!mobileMenuMounted) {
      return;
    }

    setMobileMenuVisible(false);
    const timer = window.setTimeout(() => {
      setMobileMenuMounted(false);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mobileMenuOpen, mobileMenuMounted]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(MOBILE_MENU_VISIBILITY_EVENT, {
        detail: { open: mobileMenuOpen },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(MOBILE_MENU_VISIBILITY_EVENT, {
          detail: { open: false },
        }),
      );
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  useEffect(() => {
    setSelectedTheme(resolveThemePreference(user?.themePreference ?? getStoredThemePreference()));
  }, [user?.themePreference]);

  const handleThemePreferenceChange = useCallback(
    async (nextThemePreference: ThemePreference) => {
      const previousThemePreference = selectedTheme;
      const previousUser = user;
      const nextResolvedTheme =
        nextThemePreference === 'auto'
          ? getScheduledTheme(getStoredThemeTimeZone())
          : nextThemePreference;

      setSelectedTheme(nextThemePreference);
      setTheme(nextResolvedTheme);

      if (previousUser) {
        const optimisticUser = { ...previousUser, themePreference: nextThemePreference };
        setUser(optimisticUser);
        localStorage.setItem('user', JSON.stringify(optimisticUser));
      }

      window.dispatchEvent(
        new CustomEvent(THEME_STORAGE_EVENT, {
          detail: { themePreference: nextThemePreference },
        }),
      );

      try {
        const response = await apiClient.patch('/users/me/preferences', {
          themePreference: nextThemePreference,
        });

        if (previousUser) {
          const mergedUser = {
            ...previousUser,
            ...(response.data?.user || {}),
            themePreference: nextThemePreference,
          };
          setUser(mergedUser);
          localStorage.setItem('user', JSON.stringify(mergedUser));
        }
      } catch {
        setSelectedTheme(previousThemePreference);
        setTheme(
          previousThemePreference === 'auto'
            ? getScheduledTheme(getStoredThemeTimeZone())
            : previousThemePreference,
        );

        if (previousUser) {
          setUser(previousUser);
          localStorage.setItem('user', JSON.stringify(previousUser));
        }

        window.dispatchEvent(
          new CustomEvent(THEME_STORAGE_EVENT, {
            detail: { themePreference: previousThemePreference },
          }),
        );
        toast.error(
          getText(getRecord(getRecord(nav)?.theme)?.description) || 'Failed to update theme',
        );
      }
    },
    [getText, nav, selectedTheme, setTheme, setUser, user],
  );

  const languages = useMemo(
    () =>
      [
        {
          code: 'ru' as const,
          label: languageNames.ru.value,
          note: languageModal.defaultLanguageNote.value,
        },
        { code: 'en' as const, label: languageNames.en.value },
        { code: 'kk' as const, label: languageNames.kk.value },
      ].filter(l => availableLocales.map(String).includes(l.code)) satisfies Array<{
        code: AppLanguage;
        label: string;
        note?: string;
      }>,
    [availableLocales, languageModal.defaultLanguageNote, languageNames],
  );

  const languageLabel = useMemo(() => {
    const normalizedLocale = (locale as AppLanguage) || 'ru';
    return languages.find(l => l.code === normalizedLocale)?.label ?? languageNames.ru.value;
  }, [locale, languages, languageNames.ru.value]);

  const normalizedLocale = (locale as AppLanguage) || 'ru';

  const filteredLanguages = useMemo(() => {
    const query = languageSearch.trim().toLowerCase();
    if (!query) {
      return languages;
    }

    return languages.filter(lang => lang.label.toLowerCase().includes(query));
  }, [languageSearch, languages]);

  const handleLanguageSelect = useCallback(
    (code: AppLanguage) => {
      setLocale(code);
      setLanguageModalOpen(false);
      setLanguageSearch('');
      const selectedLabel = languages.find(l => l.code === code)?.label ?? languageNames.ru.value;
      toast.success(`${languageModal.savedToastPrefix.value}: ${selectedLabel}`);
      setTimeout(() => {
        window.location.reload();
      }, 50);
    },
    [languageModal.savedToastPrefix.value, languageNames.ru.value, languages, setLocale],
  );

  const navItems = [
    {
      label: nav.dashboard,
      path: DEFAULT_APP_ROUTE,
      icon: <LayoutDashboard size={18} />,
      permission: 'statement.view',
    },
    {
      label: nav.statements,
      path: '/statements',
      icon: <FileText size={18} />,
      permission: 'statement.view',
    },
    {
      label: nav.tables,
      path: '/custom-tables',
      icon: <Table size={18} />,
      permission: 'statement.view',
    },
    {
      label: nav.workspaces,
      path: '/workspaces',
      icon: <Building2 size={18} />,
      permission: 'workspaces.view',
    },
    {
      label: nav.reports,
      path: '/reports',
      icon: <BarChart2 size={18} />,
      permission: 'statement.view',
    },
  ];

  const visibleNavItems = navItems.filter(item => hasPermission(item.permission));
  const isNavItemActive = (itemPath: string) =>
    pathname === itemPath || pathname.startsWith(`${itemPath}/`);

  const openLanguageMenu = useCallback(() => {
    setLanguageSearch('');
    setLanguageModalOpen(true);
    setMobileMenuOpen(false);
  }, []);

  const navigateFromUserMenu = useCallback(
    (path: string) => {
      setMobileMenuOpen(false);
      router.push(path);
    },
    [router],
  );

  const handleUserMenuAction = useCallback(
    (key: React.Key) => {
      switch (String(key)) {
        case 'settings':
          navigateFromUserMenu('/settings/profile');
          return;
        case 'integrations':
          navigateFromUserMenu('/integrations');
          return;
        case 'trash':
          navigateFromUserMenu('/statements/trash');
          return;
        case 'language':
          openLanguageMenu();
          return;
        case 'admin':
          navigateFromUserMenu('/admin');
          return;
        case 'knowledgeBase':
          setMobileMenuOpen(false);
          window.open('https://symonbaikov.github.io/lumio/', '_blank', 'noopener,noreferrer');
          return;
        case 'logout':
          setMobileMenuOpen(false);
          logout();
          toast.success(userMenu.logoutSuccess.value);
          return;
        default:
      }
    },
    [logout, navigateFromUserMenu, openLanguageMenu, userMenu.logoutSuccess.value],
  );

  if (
    !user ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/shared') ||
    pathname.startsWith('/invite')
  ) {
    return null;
  }

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleUserMenuItemAction = (key: string) => {
    handleUserMenuClose();
    handleUserMenuAction(key);
  };

  const renderUserActionsMenu = (mobile = false) => (
    <>
      <button
        type="button"
        onClick={handleUserMenuOpen}
        className="lumio-navigation__user-menu-trigger"
        data-tour-id={mobile ? undefined : 'user-menu-trigger'}
      >
        <Menu size={18} strokeWidth={2.25} />
        {resolveLabel(getRecord(userMenu)?.moreActions, 'Menu')}
      </button>

      <MuiMenu
        anchorEl={userMenuAnchorEl}
        open={userMenuOpen}
        onClose={handleUserMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: mobile ? 'left' : 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: mobile ? 'left' : 'right' }}
        PaperProps={{ sx: { width: 320, mt: 0.5 } }}
      >
        {/* Profile info — non-interactive */}
        <div className="lumio-navigation__profile-item">
          <div className="lumio-navigation__avatar">
            {normalizedAvatarUrl && !avatarError ? (
              <img
                src={normalizedAvatarUrl}
                alt={user.name || 'User avatar'}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <User size={20} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="lumio-navigation__profile-name">{user.name}</div>
            <div className="lumio-navigation__profile-email">{user.email}</div>
          </div>
        </div>

        <Divider />

        <MenuItem onClick={() => handleUserMenuItemAction('settings')}>
          <ListItemIcon><Settings size={18} /></ListItemIcon>
          <ListItemText>{userMenu.settings}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleUserMenuItemAction('integrations')}>
          <ListItemIcon><Plug size={18} /></ListItemIcon>
          <ListItemText>{userMenu.integrations}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleUserMenuItemAction('trash')}>
          <ListItemIcon><Trash2 size={18} /></ListItemIcon>
          <ListItemText>{trashLabel}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleUserMenuItemAction('language')}>
          <ListItemIcon><Globe size={18} /></ListItemIcon>
          <ListItemText>{userMenu.language}</ListItemText>
          <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground, #64748b)', marginLeft: 8 }}>{languageLabel}</span>
        </MenuItem>

        {isAdmin || canAccessWorkspaceActivity(currentWorkspace?.memberRole) ? (
          <MenuItem onClick={() => handleUserMenuItemAction('admin')}>
            <ListItemIcon><Zap size={18} /></ListItemIcon>
            <ListItemText>{userMenu.admin}</ListItemText>
          </MenuItem>
        ) : null}

        <MenuItem onClick={() => handleUserMenuItemAction('knowledgeBase')}>
          <ListItemIcon><BookOpen size={18} /></ListItemIcon>
          <ListItemText>{userMenu.knowledgeBase}</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => handleUserMenuItemAction('logout')}
          sx={{ color: 'error.main', '& .MuiListItemIcon-root': { color: 'error.main' } }}
        >
          <ListItemIcon><LogOut size={18} /></ListItemIcon>
          <ListItemText>{userMenu.logout}</ListItemText>
        </MenuItem>
      </MuiMenu>
    </>
  );

  return (
    <header className="lumio-navigation">
      <div className="lumio-navigation__inner">
        <div className="lumio-navigation__bar">
          <div className="lumio-navigation__brand">
            <Link
              href={DEFAULT_APP_ROUTE}
              className="lumio-navigation__logo-link"
              data-tour-id="brand"
            >
              <div className="lumio-navigation__logo-icon">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  role="img"
                  aria-labelledby="lumioLogo"
                >
                  <title id="lumioLogo">Lumio Logo</title>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className={`lumio-navigation__logo-text ${nunito.className}`}>
                LUMIO
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="lumio-navigation__primary-nav" data-tour-id="primary-nav">
              {visibleNavItems.map(item => {
                const isActive = isNavItemActive(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`lumio-navigation__nav-item${isActive ? ' lumio-navigation__nav-item--active' : ''}`}
                  >
                    <span className="lumio-navigation__nav-icon">
                      {item.icon}
                    </span>
                    <span className="lumio-navigation__nav-label">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="lumio-navigation__actions">
            <div className="lumio-navigation__desktop-actions">
              <>
                <NotificationDropdown />
                <TourMenu
                  trigger={
                    <button
                      className="lumio-navigation__icon-btn"
                      title="Help"
                    >
                      <HelpCircle size={20} />
                    </button>
                  }
                />
              </>

              {/* User Menu */}
              <div className="lumio-navigation__user-menu-area">{renderUserActionsMenu()}</div>
            </div>

            {/* Mobile menu button */}
            <div className="lumio-navigation__mobile-toggle">
              <button
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="lumio-navigation__mobile-btn"
                data-tour-id="mobile-menu-toggle"
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (slides from right) */}
      {mobileMenuMounted ? (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, pointerEvents: mobileMenuVisible ? undefined : 'none' }}
        >
          <div
            className={`lumio-navigation__mobile-drawer-overlay${mobileMenuVisible ? ' lumio-navigation__mobile-drawer-overlay--visible' : ' lumio-navigation__mobile-drawer-overlay--hidden'}`}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setMobileMenuOpen(false);
              }
            }}
          />

          <dialog
            className={`lumio-navigation__mobile-drawer${mobileMenuVisible ? '' : ' lumio-navigation__mobile-drawer--closed'}`}
            aria-modal="true"
            open
            onCancel={event => {
              event.preventDefault();
              setMobileMenuOpen(false);
            }}
          >
            <div className="lumio-navigation__mobile-drawer-header">
              <div style={{ minWidth: 0 }}>{renderUserActionsMenu(true)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <NotificationDropdown
                  iconSize={22}
                />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="lumio-navigation__mobile-drawer-close-btn"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="lumio-navigation__mobile-drawer-body">
              <div style={{ paddingTop: 4, paddingBottom: 8 }}>
                {visibleNavItems.map(item => {
                  const isActive = isNavItemActive(item.path);

                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`lumio-navigation__mobile-nav-item${isActive ? ' lumio-navigation__mobile-nav-item--active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className={isActive ? 'lumio-navigation__mobile-nav-icon--active' : 'lumio-navigation__mobile-nav-icon'}>
                        {item.icon}
                      </span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="lumio-navigation__mobile-divider" />

              <div className="lumio-navigation__mobile-section-label">
                Theme
              </div>

              {(
                [
                  {
                    key: 'light' as const,
                    label: 'Light',
                    icon: <Sun size={18} />,
                  },
                  {
                    key: 'dark' as const,
                    label: 'Dark',
                    icon: <Moon size={18} />,
                  },
                  {
                    key: 'auto' as const,
                    label: 'Auto',
                    icon: <Clock3 size={18} />,
                  },
                ] as const
              ).map(opt => {
                const active = selectedTheme === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`lumio-navigation__mobile-menu-btn${active ? ' lumio-navigation__mobile-menu-btn--active' : ''}`}
                    onClick={() => void handleThemePreferenceChange(opt.key)}
                  >
                    <span className={active ? 'lumio-navigation__mobile-nav-icon--active' : 'lumio-navigation__mobile-nav-icon'}>
                      {opt.icon}
                    </span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
                    {active && <Check size={18} />}
                  </button>
                );
              })}

              <div className="lumio-navigation__mobile-divider" />

              <TourMenu
                trigger={
                  <button
                    type="button"
                    className="lumio-navigation__mobile-menu-btn"
                  >
                    <PlayCircle size={18} className="lumio-navigation__mobile-nav-icon" />
                    <span style={{ flex: 1, textAlign: 'left' }}>
                      {resolveLabel(getRecord(nav)?.tours, 'Tours')}
                    </span>
                  </button>
                }
              />
            </div>
          </dialog>
        </div>
      ) : null}

      {portalReady && (
        <DrawerShell
          isOpen={languageModalOpen}
          onClose={() => {
            setLanguageModalOpen(false);
            setLanguageSearch('');
          }}
          title={
            <div className="lumio-navigation__lang-header">
              <button
                type="button"
                onClick={() => {
                  setLanguageModalOpen(false);
                  setLanguageSearch('');
                }}
                className="lumio-navigation__lang-back-btn"
                aria-label="Close language drawer"
              >
                <ChevronLeft style={{ width: 20, height: 20 }} />
              </button>
              <span>{languageModal.title}</span>
            </div>
          }
          position="right"
          width="lg"
          showCloseButton={false}
        >
          <div className="lumio-navigation__lang-body">
            <div className="lumio-navigation__lang-scroll">
              <div className="lumio-navigation__lang-search-wrapper">
                <Search className="lumio-navigation__lang-search-icon" />
                <input
                  type="text"
                  value={languageSearch}
                  onChange={event => setLanguageSearch(event.target.value)}
                  placeholder="Search"
                  className="lumio-navigation__lang-search-input"
                />
              </div>

              <div className="lumio-navigation__lang-list">
                {filteredLanguages.length > 0 ? (
                  filteredLanguages.map(lang => {
                    const selected = normalizedLocale === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageSelect(lang.code)}
                        className={`lumio-navigation__lang-option${selected ? ' lumio-navigation__lang-option--selected' : ''}`}
                      >
                        <span className="lumio-navigation__lang-option-label">{lang.label}</span>
                        {selected ? <Check style={{ width: 20, height: 20, color: 'var(--color-primary)' }} /> : null}
                      </button>
                    );
                  })
                ) : (
                  <p className="lumio-navigation__lang-empty">
                    No languages found
                  </p>
                )}
              </div>
            </div>
          </div>
        </DrawerShell>
      )}
    </header>
  );
}
