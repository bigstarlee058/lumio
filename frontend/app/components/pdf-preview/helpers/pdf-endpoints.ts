const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');

export { apiBaseUrl };

export function getFileEndpoint(source: 'statement' | 'gmail' | 'receipt', fileId: string): string {
  if (source === 'gmail') {
    return `${apiBaseUrl}/integrations/gmail/receipts/${fileId}/file`;
  }

  if (source === 'receipt') {
    return `${apiBaseUrl}/receipts/${fileId}/file`;
  }

  return `${apiBaseUrl}/statements/${fileId}/file`;
}
