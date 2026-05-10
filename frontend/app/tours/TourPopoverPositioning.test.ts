import { describe, expect, it } from 'vitest';
import {
  clampTourPopoverToBounds,
  clampTourPopoverToViewport,
  positionTourPopoverNearElement,
} from './TourPopoverPositioning';

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

function createPopoverRect(rect: DOMRectInit): HTMLElement {
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

function createTargetRect(rect: DOMRectInit): HTMLElement {
  const target = document.createElement('button');
  target.getBoundingClientRect = () => {
    const left = rect.left ?? rect.x ?? 0;
    const top = rect.top ?? rect.y ?? 0;
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
  document.body.appendChild(target);
  return target;
}

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
});
