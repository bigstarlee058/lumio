/**
 * React hook for working with tours
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getTourManager } from '../tours/TourManager';
import type { TourConfig } from '../tours/types';

type TourManagerType = ReturnType<typeof getTourManager>;

interface UseTourActions {
  startTour: (customTourId?: string) => void;
  resumeTour: () => boolean;
  stopTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  resetTour: (customTourId?: string) => void;
}

interface UseTourReturn extends UseTourActions {
  isActive: boolean;
  currentStep: number | null;
  isCompleted: boolean;
  tourManager: TourManagerType;
}

interface TourStateSyncParams {
  tourId: string | undefined;
  tourManager: TourManagerType;
  setIsActive: (v: boolean) => void;
  setCurrentStep: (v: number | null) => void;
  setIsCompleted: (v: boolean) => void;
  isActive: boolean;
}

function useTourBaseActions(
  tourId: string | undefined,
  tourManager: TourManagerType,
): UseTourActions {
  const startTour = useCallback(
    (customTourId?: string): void => {
      const id = customTourId || tourId;
      if (!id) {
        console.error('Tour ID is required');
        return;
      }
      void tourManager.startTour(id);
    },
    [tourId, tourManager],
  );

  const resumeTour = useCallback((): boolean => tourManager.resumeTour(), [tourManager]);
  const stopTour = useCallback((): void => { tourManager.stopTour(); }, [tourManager]);
  const nextStep = useCallback((): void => { tourManager.nextStep(); }, [tourManager]);
  const previousStep = useCallback((): void => { tourManager.previousStep(); }, [tourManager]);

  const resetTour = useCallback(
    (customTourId?: string): void => {
      const id = customTourId || tourId;
      if (id) tourManager.resetTour(id);
    },
    [tourId, tourManager],
  );

  return { startTour, resumeTour, stopTour, nextStep, previousStep, resetTour };
}

function useTourStateSync(params: TourStateSyncParams): void {
  const { tourId, tourManager, setIsActive, setCurrentStep, setIsCompleted, isActive } = params;

  useEffect(() => {
    if (tourId) setIsCompleted(tourManager.isTourCompleted(tourId));
  }, [tourId, tourManager, setIsCompleted]);

  useEffect(() => {
    const interval = setInterval(() => {
      const active = tourManager.isActive();
      setIsActive(active);
      setCurrentStep(tourManager.getActiveStepIndex());
      if (!active && isActive && tourId) {
        setIsCompleted(tourManager.isTourCompleted(tourId));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [tourManager, tourId, isActive, setIsActive, setCurrentStep, setIsCompleted]);
}

export function useTour(tourId?: string): UseTourReturn {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const tourManager = getTourManager({
    onNavigate: (url: string): Promise<void> => {
      router.push(url);
      return new Promise(resolve => setTimeout(resolve, 300));
    },
  });

  const base = useTourBaseActions(tourId, tourManager);
  useTourStateSync({ tourId, tourManager, setIsActive, setCurrentStep, setIsCompleted, isActive });

  const startTour = useCallback(
    (customTourId?: string): void => { base.startTour(customTourId); setIsActive(true); },
    [base],
  );
  const resumeTour = useCallback((): boolean => {
    const resumed = base.resumeTour();
    if (resumed) setIsActive(true);
    return resumed;
  }, [base]);
  const stopTour = useCallback((): void => {
    base.stopTour(); setIsActive(false); setCurrentStep(null);
  }, [base]);
  const resetTour = useCallback(
    (customTourId?: string): void => { base.resetTour(customTourId); setIsCompleted(false); },
    [base],
  );

  return {
    startTour, resumeTour, stopTour, resetTour,
    nextStep: base.nextStep, previousStep: base.previousStep,
    isActive, currentStep, isCompleted, tourManager,
  };
}

/**
 * Hook for automatic tour start for new users
 */
export function useAutoTour(
  tourId: string,
  options?: { condition?: boolean; delay?: number },
): void {
  const { startTour, isCompleted } = useTour(tourId);
  const { condition = true, delay = 1000 } = options || {};

  useEffect(() => {
    if (!isCompleted && condition) {
      const timer = setTimeout(() => { startTour(); }, delay);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, condition, delay, startTour]);
}

/**
 * Hook for registering tours
 */
export function useRegisterTours(tours: TourConfig[]): void {
  const tourManager = getTourManager();
  useEffect(() => { tourManager.registerTours(tours); }, [tours, tourManager]);
}

/**
 * Hook for getting list of all tours
 */
export function useAvailableTours(): TourConfig[] {
  const tourManager = getTourManager();
  const [tours, setTours] = useState<TourConfig[]>([]);
  useEffect(() => { setTours(tourManager.getAllTours()); }, [tourManager]);
  return tours;
}
