export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out',
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timeoutHandle: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new TimeoutError(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

type RetryOptions = {
  retries: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
};

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const retries = Math.max(0, Math.floor(options.retries));
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 5000;
  const factor = options.factor ?? 2;
  const jitter = options.jitter ?? true;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = options.isRetryable ? options.isRetryable(error) : true;
      if (!isRetryable || attempt >= retries) {
        throw error;
      }

      const expDelay = baseDelayMs * factor ** attempt;
      const capped = Math.min(expDelay, maxDelayMs);
      const delayMs = jitter ? Math.floor(capped * (0.5 + Math.random())) : Math.floor(capped);

      attempt += 1;
      options.onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }
}
