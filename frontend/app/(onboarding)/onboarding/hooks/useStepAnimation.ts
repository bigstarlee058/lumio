import { useLayoutEffect, useRef, useState } from 'react';

type UseStepAnimationResult = {
  animatedBlockHeight: number | null;
  isStepTransitioning: boolean;
  stepBlockRef: React.RefObject<HTMLDivElement | null>;
};

type UseStepAnimationParams = {
  currentStep: number;
  hideMainNavigation: boolean;
  isWorkspaceCurrencyPickerView: boolean;
};

export function useStepAnimation({
  currentStep,
  hideMainNavigation,
  isWorkspaceCurrencyPickerView,
}: UseStepAnimationParams): UseStepAnimationResult {
  const [animatedBlockHeight, setAnimatedBlockHeight] = useState<number | null>(null);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const stepBlockRef = useRef<HTMLDivElement | null>(null);
  const hasStepMountedRef = useRef(false);

  useLayoutEffect((): (() => void) => {
    if (!hasStepMountedRef.current) {
      hasStepMountedRef.current = true;
      return (): void => {};
    }
    setIsStepTransitioning(true);
    const timer = window.setTimeout((): void => {
      setIsStepTransitioning(false);
    }, 370);
    return (): void => {
      window.clearTimeout(timer);
    };
  }, [currentStep]);

  useLayoutEffect((): (() => void) => {
    const node = stepBlockRef.current;
    if (!node) return (): void => {};

    let frame = 0;
    const measure = (): void => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame((): void => {
        setAnimatedBlockHeight(node.scrollHeight);
      });
    };

    measure();
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(node);
    window.addEventListener('resize', measure);

    return (): void => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [currentStep, hideMainNavigation, isWorkspaceCurrencyPickerView]);

  return { animatedBlockHeight, isStepTransitioning, stepBlockRef };
}
