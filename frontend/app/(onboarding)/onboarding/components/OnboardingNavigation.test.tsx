// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { OnboardingNavigation } from './OnboardingNavigation';

const labels = {
  back: 'Back',
  next: 'Next',
  finish: 'Finish',
  skip: 'Skip',
  skipAll: 'Skip all',
  saving: 'Saving...',
};

describe('OnboardingNavigation', () => {
  it('keeps back enabled when create-workspace flow can exit from its first visible step', () => {
    const onBack = vi.fn();

    render(
      <OnboardingNavigation
        currentStep={0}
        totalSteps={3}
        isSubmitting={false}
        showSkip
        canExitOnBack
        onBack={onBack}
        onNext={vi.fn()}
        onSkip={vi.fn()}
        onSkipAll={vi.fn()}
        labels={labels}
      />, 
    );

    const backButton = screen.getByRole('button', { name: 'Back' });
    expect(backButton).not.toBeDisabled();

    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
