import type { AxiosError } from 'axios';

export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
}

export function getApiErrorMessage(error: unknown, fallback = 'An error occurred'): string {
  if (isAxiosError(error)) {
    const message =
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      error.message ??
      fallback;

    return normalizeApiErrorMessage(message, error.response?.data?.error?.code);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function normalizeApiErrorMessage(message: string, code?: string): string {
  const englishByCode = new Map<string, string>([
    ['BAD_REQUEST', 'Bad request'],
    ['UNAUTHORIZED', 'Unauthorized'],
    ['FORBIDDEN', 'Forbidden'],
    ['NOT_FOUND', 'Not found'],
    ['VALIDATION_ERROR', 'Validation error'],
    ['TOO_MANY_REQUESTS', 'Too many requests'],
    ['INTERNAL_SERVER_ERROR', 'Internal server error'],
  ]);

  const englishByLocalizedMessage: Record<string, string> = {
    'Некорректный запрос': 'Bad request',
    'Не авторизован': 'Unauthorized',
    'Доступ запрещен': 'Forbidden',
    'Ресурс не найден': 'Not found',
    'Ошибка валидации': 'Validation error',
    'Слишком много запросов': 'Too many requests',
    'Внутренняя ошибка сервера': 'Internal server error',
  };

  return (
    englishByLocalizedMessage[message] ?? (code ? englishByCode.get(code) : undefined) ?? message
  );
}

export function getApiErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}
