import { AsyncLocalStorage } from 'node:async_hooks';

type RequestContextStore = {
  requestId: string;
  traceId: string;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

export const RequestContext = {
  run<T>(store: RequestContextStore, fn: () => T): T {
    return storage.run(store, fn);
  },
  get(): RequestContextStore | undefined {
    return storage.getStore();
  },
  getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
  getTraceId(): string | undefined {
    return storage.getStore()?.traceId;
  },
};
