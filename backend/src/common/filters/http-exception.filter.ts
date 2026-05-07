import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { RequestContext } from '../observability/request-context';

type MessageWithDetails = {
  message?: unknown;
};

const isMessageWithDetails = (value: unknown): value is MessageWithDetails =>
  typeof value === 'object' && value !== null && 'message' in value;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const locale = this.resolveLocale(request);

    // Debug log to surface unexpected errors in logs
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        { type: 'unhandled_exception', url: request.url, method: request.method },
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const errorResponse = {
      error: {
        code: this.getErrorCode(status),
        message: this.getLocalizedMessage(status, message, locale),
        details: isMessageWithDetails(message) && message.message ? message : undefined,
      },
      requestId: RequestContext.getRequestId(),
      traceId: RequestContext.getTraceId(),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      422: 'VALIDATION_ERROR',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return codes[status] || 'UNKNOWN_ERROR';
  }

  private resolveLocale(request: AuthenticatedRequest): 'en' | 'ru' {
    const userLocale = request.user?.locale;
    const headerLocale = request.headers['accept-language'];
    const normalizedHeader = Array.isArray(headerLocale)
      ? headerLocale[0]
      : headerLocale?.split(',')[0];

    const locale = userLocale || normalizedHeader || 'ru';
    return locale.startsWith('en') ? 'en' : 'ru';
  }

  private getLocalizedMessage(status: number, rawMessage: unknown, locale: 'en' | 'ru'): string {
    const localizedByStatus: Record<number, { en: string; ru: string }> = {
      400: { en: 'Bad request', ru: 'Некорректный запрос' },
      401: { en: 'Unauthorized', ru: 'Не авторизован' },
      403: { en: 'Forbidden', ru: 'Доступ запрещен' },
      404: { en: 'Not found', ru: 'Ресурс не найден' },
      422: { en: 'Validation error', ru: 'Ошибка валидации' },
      429: { en: 'Too many requests', ru: 'Слишком много запросов' },
      500: { en: 'Internal server error', ru: 'Внутренняя ошибка сервера' },
    };

    const defaultEnglishMessages = new Set([
      'Internal server error',
      'Forbidden resource',
      'Unauthorized',
      'Too Many Requests',
      'Bad Request',
      'Not Found',
      'Validation failed',
    ]);

    const extractedMessage =
      typeof rawMessage === 'string'
        ? rawMessage
        : ((isMessageWithDetails(rawMessage) ? rawMessage.message : undefined) ??
          localizedByStatus[status]?.[locale] ??
          'Error');

    if (Array.isArray(extractedMessage)) {
      return localizedByStatus[status]?.[locale] ?? 'Error';
    }

    if (typeof extractedMessage === 'string' && defaultEnglishMessages.has(extractedMessage)) {
      return localizedByStatus[status]?.[locale] ?? extractedMessage;
    }

    if (typeof extractedMessage === 'string' && extractedMessage) {
      return extractedMessage;
    }

    return localizedByStatus[status]?.[locale] || 'Error';
  }
}
