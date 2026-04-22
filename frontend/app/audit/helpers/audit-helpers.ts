type ErrorLike = { message?: string; response?: { data?: { message?: string } } };

function extractErrMsg(err: ErrorLike): string {
  const msg = err.response?.data?.message;
  return msg || err.message || '';
}

export function getErrorMessage({ error, fallback }: { error: unknown; fallback: string }): string {
  if (typeof error === 'object' && error !== null) {
    return extractErrMsg(error as ErrorLike) || fallback;
  }
  return fallback;
}
