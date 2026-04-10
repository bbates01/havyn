import type { PaginatedResponse } from '../types/PaginatedResponse';
import type { FormHistoryItem } from '../types/FormHistory';
import { apiFetch, buildQuery } from './apiHelper';

export async function fetchFormHistory(params: {
  pageSize: number;
  pageIndex: number;
  sortOrder?: 'asc' | 'desc';
  residentId?: number;
}): Promise<PaginatedResponse<FormHistoryItem>> {
  const query = buildQuery(
    params as Record<string, string | number | boolean | undefined>
  );
  const data = await apiFetch<{
    items?: FormHistoryItem[];
    Items?: FormHistoryItem[];
    totalCount?: number;
    TotalCount?: number;
  }>(`/api/FormHistory${query}`);

  return {
    items: data.items ?? data.Items ?? [],
    totalCount: data.totalCount ?? data.TotalCount ?? 0,
  };
}

