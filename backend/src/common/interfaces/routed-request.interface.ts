import type { Request } from 'express';

type RequestRoute = {
  path?: string;
};

export type RoutedRequest = Request & {
  baseUrl?: string;
  route?: RequestRoute;
};
