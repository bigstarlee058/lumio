import type { PopoverDOM } from 'driver.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clampTourPopoverToBounds,
  clampTourPopoverToViewport,
  cleanupStableTourPopoverPositioning,
  positionTourPopoverNearElement,
  stabilizeTourPopover,
} from './TourPopoverPositioning';

interface TestRect {
  x?: number;
  y?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

function createPopoverRect(rect: TestRect): HTMLElement {
  const popover = document.createElement('div');
  popover.getBoundingClientRect = () => {
    const left = popover.style.left
      ? Number.parseFloat(popover.style.left)
      : (rect.left ?? rect.x ?? 0);
    const top = popover.style.top
      ? Number.parseFloat(popover.style.top)
      : (rect.top ?? rect.y ?? 0);
    const width = rect.width ?? 0;
    const height = rect.height ?? 0;
    return {
      x: left,
      y: top,
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      toJSON: () => ({}),
    };
  };
  document.body.appendChild(popover);
  return popover;
}

function createTargetRect(rect: TestRect | (() => TestRect)): HTMLElement {
  const target = document.createElement('button');
  target.getBoundingClientRect = () => {
    const currentRect = typeof rect === 'function' ? rect() : rect;
    const left = currentRect.left ?? currentRect.x ?? 0;
    const top = currentRect.top ?? currentRect.y ?? 0;
    const width = currentRect.width ?? 0;
    const height = currentRect.height ?? 0;
    return {
      x: left,
      y: top,
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      toJSON: () => ({}),
    };
  };
  document.body.appendChild(target);
  return target;
}

function createPopoverDom(wrapper: HTMLElement): PopoverDOM {
  const footer = document.createElement('footer');
  const footerButtons = document.createElement('div');
  const previousButton = document.createElement('button');
  const nextButton = document.createElement('button');
  const closeButton = document.createElement('button');

  return {
    wrapper,
    arrow: document.createElement('div'),
    title: document.createElement('h2'),
    description: document.createElement('div'),
    footer,
    progress: document.createElement('span'),
    previousButton,
    nextButton,
    closeButton,
    footerButtons,
  };
}

afterEach(() => {
  cleanupStableTourPopoverPositioning();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('clampTourPopoverToViewport', () => {
  it('keeps a popover inside the viewport when Driver.js places it off-screen', () => {
    setViewport(390, 700);
    const popover = createPopoverRect({
      left: -120,
      top: 620,
      width: 360,
      height: 180,
    });

    clampTourPopoverToViewport(popover);

    expect(popover.style.left).toBe('16px');
    expect(popover.style.top).toBe('504px');
    expect(popover.style.right).toBe('auto');
    expect(popover.style.bottom).toBe('auto');
    expect(popover.style.transform).toBe('none');
  });

  it('leaves a correctly positioned popover untouched', () => {
    setViewport(1024, 768);
    const popover = createPopoverRect({
      left: 240,
      top: 120,
      width: 320,
      height: 180,
    });

    clampTourPopoverToViewport(popover);

    expect(popover.getAttribute('style')).toBeNull();
  });

  it('keeps a popover inside application layout bounds, not only the browser viewport', () => {
    setViewport(1200, 720);
    const popover = createPopoverRect({
      left: 0,
      top: 300,
      width: 400,
      height: 240,
    });

    clampTourPopoverToBounds(popover, {
      left: 496,
      top: 0,
      width: 520,
      height: 720,
    });

    expect(popover.style.left).toBe('512px');
    expect(popover.style.top).toBe('300px');
  });

  it('positions the popover next to the highlighted element', () => {
    setViewport(1200, 900);
    const popover = createPopoverRect({
      left: 0,
      top: 0,
      width: 400,
      height: 220,
    });
    const target = createTargetRect({
      left: 96,
      top: 700,
      width: 112,
      height: 112,
    });

    positionTourPopoverNearElement(
      popover,
      target,
      { left: 0, top: 0, width: 1200, height: 900 },
      { side: 'top', align: 'start' },
    );

    expect(popover.style.left).toBe('96px');
    expect(popover.style.top).toBe('468px');
  });

  it('keeps the popover attached when the highlighted element moves without scroll or resize', async () => {
    vi.useFakeTimers();
    setViewport(1200, 900);
    let targetLeft = 96;
    const popover = createPopoverRect({
      left: 0,
      top: 0,
      width: 400,
      height: 220,
    });
    const target = createTargetRect(() => ({
      left: targetLeft,
      top: 180,
      width: 112,
      height: 48,
    }));
    target.classList.add('driver-active-element');

    stabilizeTourPopover(createPopoverDom(popover), { side: 'bottom', align: 'start' });

    expect(popover.style.left).toBe('96px');
    expect(popover.style.top).toBe('240px');

    targetLeft = 360;
    await vi.advanceTimersByTimeAsync(32);

    expect(popover.style.left).toBe('360px');
    expect(popover.style.top).toBe('240px');
  });
});
