import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { RequestContext } from './request-context';

const extractTraceIdFromTraceParent = (traceParent: string | undefined): string | null => {
  if (!traceParent) return null;
  // W3C traceparent: "00-<trace-id>-<parent-id>-<flags>"
  const parts = traceParent.split('-');
  const traceId = parts.length >= 2 ? parts[1] : null;
  return traceId && /^[0-9a-f]{32}$/i.test(traceId) ? traceId : null;
};

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingRequestId = req.header('x-request-id') || req.header('x-correlation-id');
  const requestId = incomingRequestId?.trim() || uuidv4();

  const traceParent = req.header('traceparent');
  const extractedTraceId = extractTraceIdFromTraceParent(traceParent);
  const traceId = extractedTraceId || requestId.replace(/-/g, '').slice(0, 32);

  res.setHeader('x-request-id', requestId);
  res.setHeader('x-trace-id', traceId);

  const typedRequest = req as AuthenticatedRequest;
  typedRequest.requestId = requestId;
  typedRequest.traceId = traceId;

  return RequestContext.run({ requestId, traceId }, () => next());
}
