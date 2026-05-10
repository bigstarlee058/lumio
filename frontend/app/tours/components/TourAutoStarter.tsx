/**
 * Component for automatic tour start on first page visit
 */

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { getTourManager } from '../TourManager';

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function isOnCooldown(tourId: string): boolean {
  try {
    const raw = localStorage.getItem(`lumio_tour_last_shown:${tourId}`);
    if (!raw) {
      return false;
    }
    const timestamp = Number(raw);
    if (Number.isNaN(timestamp)) {
      return false;
    }
    return Date.now() - timestamp < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markShown(tourId: string): void {
  try {
    localStorage.setItem(`lumio_tour_last_shown:${tourId}`, Date.now().toString());
  } catch {
    // ignore
  }
}

interface TryStartParams {
  pathname: string;
  attemptsLeft: number;
  cancelled: () => boolean;
  triggered: Set<string>;
}

interface TourStartContext {
  params: TryStartParams;
  tourId: string;
}

function scheduleTourStart(ctx: TourStartContext): void {
  const { params, tourId } = ctx;
  const { cancelled, triggered, pathname } = params;
  const tourManager = getTourManager();
  triggered.add(pathname);
  window.requestAnimationFrame(() => {
    if (cancelled() || tourManager.isActive()) {
      return;
    }
    markShown(tourId);
    void tourManager.startTour(tourId);
  });
}

function retryOrAbort(params: TryStartParams): void {
  if (params.attemptsLeft > 0) {
    window.requestAnimationFrame(() =>
      tryStartTour({ ...params, attemptsLeft: params.attemptsLeft - 1 }),
    );
  }
}

function resolveAndStartTour(params: TryStartParams): void {
  const { pathname, triggered } = params;
  const tourManager = getTourManager();
  const allTours = tourManager.getAllTours();

  if (allTours.length === 0) {
    retryOrAbort(params);
    return;
  }

  const tour = allTours.find(t => t.page && pathname.startsWith(t.page));
  if (!tour) {
    triggered.add(pathname);
    return;
  }

  const blocked =
    tourManager.isTourCompleted(tour.id) || isOnCooldown(tour.id) || tourManager.isActive();
  if (blocked) {
    triggered.add(pathname);
    return;
  }

  scheduleTourStart({ params, tourId: tour.id });
}

function tryStartTour(params: TryStartParams): void {
  if (params.cancelled() || params.triggered.has(params.pathname)) {
    return;
  }
  resolveAndStartTour(params);
}

export function TourAutoStarter(): null {
  const pathname = usePathname();
  const hasTriggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (hasTriggeredRef.current.has(pathname)) {
      return;
    }

    let isCancelled = false;
    const cancelled = (): boolean => isCancelled;

    // ~1 sec of retries (60 frames) in case TourMenu hasn't registered tours yet.
    tryStartTour({ pathname, attemptsLeft: 60, cancelled, triggered: hasTriggeredRef.current });

    return (): void => {
      isCancelled = true;
    };
  }, [pathname]);

  return null;
}
