'use client';

interface OnboardingProgressProps {
  currentStep: number;
  stepLabels: string[];
}

export function OnboardingProgress({ currentStep, stepLabels }: OnboardingProgressProps) {
  const totalSteps = stepLabels.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const columnsClass =
    totalSteps === 3
      ? 'grid-cols-3'
      : totalSteps === 4
        ? 'grid-cols-4'
        : 'grid-cols-5';

  return (
    <div className="space-y-4">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={`grid gap-2 ${columnsClass}`}>
        {stepLabels.map((label, index) => {
          const isActive = index === currentStep;
          const isPassed = index < currentStep;
          return (
            <div
              key={label}
              className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-colors sm:text-sm ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : isPassed
                    ? 'border-primary/40 bg-primary/5 text-primary'
                    : 'border-border bg-card text-muted-foreground'
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
