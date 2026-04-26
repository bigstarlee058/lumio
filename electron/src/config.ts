import { app } from 'electron';

export const DEV_URL = 'http://localhost:3000';
export const PROD_URL = 'https://lumio-app-production-627d.up.railway.app';

export const isDev = !app.isPackaged;

export function getLoadURL(): string {
  return isDev ? DEV_URL : PROD_URL;
}
