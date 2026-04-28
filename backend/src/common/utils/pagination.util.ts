/**
 * Normalizes pagination query params to safe values.
 */
export function normalizePagination(
  query: { page?: number | null; limit?: number | null },
  options: { defaultLimit?: number; maxLimit?: number } = {},
): { page: number; limit: number; skip: number } {
  const { defaultLimit = 20, maxLimit = 100 } = options;
  const page = Math.max(Number(query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query.limit ?? defaultLimit), 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}
