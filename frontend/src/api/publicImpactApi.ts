import type { PublicImpactSnapshot } from '../types/PublicImpactSnapshot';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchSnapshots(params: { pageSize: number; pageIndex: number }) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<PublicImpactSnapshot>>(`/api/public-impact${query}`);
}

export function getSnapshot(id: number) {
  return apiFetch<PublicImpactSnapshot>(`/api/public-impact/${id}`);
}
