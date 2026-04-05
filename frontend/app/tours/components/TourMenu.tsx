/**
 * Tour menu component
 */

'use client';

import { useIntlayer } from '@/app/i18n';
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { Circle, Disc, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cloneElement, isValidElement, useEffect, useState } from 'react';
import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { getTourManager } from '../TourManager';
import { createAdminTour } from '../admin-tour';
import { createCategoriesTour } from '../categories-tour';
import { createCustomTablesTour } from '../custom-tables-tour';
import { createGoogleSheetsImportTour } from '../google-sheets-import-tour';
import { createGoogleSheetsIntegrationTour } from '../google-sheets-integration-tour';
import { createIntegrationsTour } from '../integrations-tour';
import { createReportsTour } from '../reports-tour';
import { createSettingsTour } from '../settings-tour';
import { createStatementsTour } from '../statements-tour';
import type { TourConfig } from '../types';

type CreateStatementsTourInput = Parameters<typeof createStatementsTour>[0];
type CreateCustomTablesTourInput = Parameters<typeof createCustomTablesTour>[0];
type CreateReportsTourInput = Parameters<typeof createReportsTour>[0];
type CreateCategoriesTourInput = Parameters<typeof createCategoriesTour>[0];
type CreateIntegrationsTourInput = Parameters<typeof createIntegrationsTour>[0];
type CreateGoogleSheetsImportTourInput = Parameters<typeof createGoogleSheetsImportTour>[0];
type CreateGoogleSheetsIntegrationTourInput = Parameters<
  typeof createGoogleSheetsIntegrationTour
>[0];
type CreateSettingsTourInput = Parameters<typeof createSettingsTour>[0];
type CreateAdminTourInput = Parameters<typeof createAdminTour>[0];

function getPreferredLang(): string {
  if (typeof document !== 'undefined') {
    const lang = document.documentElement?.lang;
    if (lang) return lang;
  }
  return 'ru';
}

type TranslationRecord = Record<string, unknown>;

type TourStepText = { title: string; description: string };
type TourStepTextMap = Record<string, TourStepText>;
type TourTextContent = {
  name?: unknown;
  description?: unknown;
  steps?: unknown;
  content?: {
    name?: unknown;
    description?: unknown;
    steps?: unknown;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function unwrapIntlayerNode(node: unknown): unknown {
  if (!node || typeof node !== 'object') return node;

  // Intlayer (react-intlayer) wraps primitives into a Proxy of a ReactElement.
  // The Proxy exposes `.value` via a getter trap, so `'value' in node` is false.
  const maybeValue = (node as { value?: unknown }).value;
  if (typeof maybeValue !== 'undefined') return maybeValue;

  // Dictionary JSON shape: { nodeType: 'translation', translation: { ru: ..., en: ... } }
  if (
    (node as { nodeType?: unknown }).nodeType === 'translation' &&
    isRecord((node as { translation?: unknown }).translation)
  ) {
    const lang = getPreferredLang();
    const translation = (node as { translation: TranslationRecord }).translation;
    return translation[lang] ?? translation.ru ?? Object.values(translation)[0];
  }

  return node;
}

function extractText(node: unknown): string {
  const unwrapped = unwrapIntlayerNode(node);
  if (typeof unwrapped === 'string') return unwrapped;
  return String(unwrapped ?? '');
}

// Helper function for converting IntlayerNode to strings
function extractStepsValues(steps: unknown): TourStepTextMap {
  const result: TourStepTextMap = {};
  const resolvedSteps = unwrapIntlayerNode(steps);
  if (!resolvedSteps || typeof resolvedSteps !== 'object') return result;

  for (const [key, value] of Object.entries(resolvedSteps)) {
    const resolvedStep = unwrapIntlayerNode(value);
    result[key] = {
      title: extractText(isRecord(resolvedStep) ? resolvedStep.title : undefined),
      description: extractText(isRecord(resolvedStep) ? resolvedStep.description : undefined),
    };
  }
  return result;
}

function getTourContentSteps(texts: TourTextContent): unknown {
  return texts.steps ?? texts.content?.steps;
}

function getNodeString(node: unknown): string | undefined {
  if (typeof node === 'string') return node;
  if (isRecord(node) && typeof node.value === 'string') return node.value;
  return undefined;
}

function getTourMeta(texts: TourTextContent): { name?: string; description?: string } {
  const resolved = texts.content ?? texts;
  const nameNode = isRecord(resolved) ? resolved.name : undefined;
  const descriptionNode = isRecord(resolved) ? resolved.description : undefined;
  return {
    name: getNodeString(nameNode),
    description: getNodeString(descriptionNode),
  };
}

function getTypedTourInput<T extends { name?: string; description?: string; steps: object }>(
  texts: TourTextContent,
): { name?: string; description?: string; steps: T['steps'] } {
  return {
    ...getTourMeta(texts),
    steps: extractStepsValues(getTourContentSteps(texts)) as T['steps'],
  };
}

interface TourMenuProps {
  trigger?: ReactNode;
  className?: string;
}

export function TourMenu({ trigger, className = '' }: TourMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tours, setTours] = useState<TourConfig[]>([]);
  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());
  const open = Boolean(anchorEl);
  const router = useRouter();

  // Get translations for all tours
  const navigationTexts = useIntlayer('navigation');
  const statementsTexts = useIntlayer('statements-tour');
  const customTablesTexts = useIntlayer('custom-tables-tour-content');
  const reportsTexts = useIntlayer('reports-tour-content');
  const categoriesTexts = useIntlayer('categories-tour-content');
  const integrationsTexts = useIntlayer('integrations-tour-content');
  const settingsTexts = useIntlayer('settings-tour-content');
  const adminTexts = useIntlayer('admin-tour-content');
  const googleSheetsImportTexts = useIntlayer('google-sheets-import-tour-content');
  const googleSheetsIntegrationTexts = useIntlayer('google-sheets-integration-tour-content');

  // Register tours on mount
  useEffect(() => {
    const tourManager = getTourManager();

    // Create and register all tours
    const allTours = [
      createStatementsTour(statementsTexts),
      createCustomTablesTour(getTypedTourInput<CreateCustomTablesTourInput>(customTablesTexts)),
      createReportsTour(getTypedTourInput<CreateReportsTourInput>(reportsTexts)),
      createCategoriesTour(getTypedTourInput<CreateCategoriesTourInput>(categoriesTexts)),
      createIntegrationsTour(getTypedTourInput<CreateIntegrationsTourInput>(integrationsTexts)),
      getTourContentSteps(googleSheetsImportTexts)
        ? createGoogleSheetsImportTour(
            getTypedTourInput<CreateGoogleSheetsImportTourInput>(googleSheetsImportTexts),
          )
        : null,
      getTourContentSteps(googleSheetsIntegrationTexts)
        ? createGoogleSheetsIntegrationTour(
            getTypedTourInput<CreateGoogleSheetsIntegrationTourInput>(googleSheetsIntegrationTexts),
          )
        : null,
      createSettingsTour(getTypedTourInput<CreateSettingsTourInput>(settingsTexts)),
      createAdminTour(getTypedTourInput<CreateAdminTourInput>(adminTexts)),
    ].filter(Boolean) as TourConfig[];

    allTours.forEach(tour => tourManager.registerTour(tour));
  }, [
    statementsTexts,
    customTablesTexts,
    reportsTexts,
    categoriesTexts,
    integrationsTexts,
    settingsTexts,
    adminTexts,
  ]);

  useEffect(() => {
    const tourManager = getTourManager();
    const registeredTours = tourManager.getAllTours();
    setTours(registeredTours);

    // Function for updating list of completed tours
    const updateCompletedTours = () => {
      const completed = new Set<string>();
      registeredTours.forEach(tour => {
        if (tourManager.isTourCompleted(tour.id)) {
          completed.add(tour.id);
        }
      });
      setCompletedTours(completed);
    };

    updateCompletedTours();

    // Update list on localStorage change (when tour is completed)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lumio_tour_state') {
        updateCompletedTours();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check every 500ms if menu is open (for update in same tab)
    let interval: NodeJS.Timeout | null = null;
    if (open) {
      interval = setInterval(updateCompletedTours, 500);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (interval) clearInterval(interval);
    };
  }, [open]); // Update on menu open

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTourSelect = async (tourId: string) => {
    const tourManager = getTourManager();
    const tour = tours.find(t => t.id === tourId);

    handleClose();

    // If tour is already completed, reset it so it can be taken again
    if (tourManager.isTourCompleted(tourId)) {
      tourManager.resetTour(tourId);
    }

    // If tour has a page and we are not on it - navigate there
    if (tour?.page && !window.location.pathname.startsWith(tour.page)) {
      router.push(tour.page);
      // Wait for page load before starting tour
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    tourManager.startTour(tourId, 0, {
      nextBtnText: navigationTexts.tour.buttons.next.value,
      prevBtnText: navigationTexts.tour.buttons.prev.value,
      doneBtnText: navigationTexts.tour.buttons.done.value,
      progressText: navigationTexts.tour.progressText?.value ?? '{{current}} / {{total}}',
    });
  };

  const defaultTrigger = (
    <button
      type="button"
      onClick={handleClick}
      aria-label={navigationTexts.tour.menuLabel?.value ?? 'Tours'}
      className={`h-9 w-9 rounded-full flex items-center justify-center shadow-sm ${className} bg-primary text-white`}
    >
      <HelpCircle size={16} />
    </button>
  );

  return (
    <>
      {trigger ? (
        isValidElement(trigger) ? (
          cloneElement(
            trigger as ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>,
            {
              onClick: (event: MouseEvent<HTMLElement>) => {
                (
                  trigger.props as
                    | { onClick?: (event: MouseEvent<HTMLElement>) => void }
                    | undefined
                )?.onClick?.(event);
                handleClick(event);
              },
            },
          )
        ) : (
          <button type="button" onClick={handleClick}>
            {trigger as ReactNode}
          </button>
        )
      ) : (
        defaultTrigger
      )}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            minWidth: 250,
            mt: 1,
          },
        }}
      >
        {tours.length === 0 && (
          <MenuItem disabled>
            <ListItemText primary="Tours not found" />
          </MenuItem>
        )}
        {tours.map((tour, index) => {
          const isCompleted = completedTours.has(tour.id);
          return (
            <div key={tour.id}>
              {index > 0 && index % 3 === 0 && <Divider />}
              <MenuItem onClick={() => handleTourSelect(tour.id)}>
                <ListItemIcon>
                  {isCompleted ? (
                    <Disc size={20} style={{ color: '#3b82f6' }} />
                  ) : (
                    <Circle size={20} style={{ color: '#9ca3af' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={tour.name}
                  secondary={tour.description}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                  secondaryTypographyProps={{
                    fontSize: 12,
                    noWrap: true,
                  }}
                />
              </MenuItem>
            </div>
          );
        })}
      </Menu>
    </>
  );
}
