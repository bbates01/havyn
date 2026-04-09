import type { Supporter } from '../types/Supporter';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchSupporters(params: {
  pageSize: number;
  pageIndex: number;
  supporterType?: string;
  status?: string;
  region?: string;
  country?: string;
  acquisitionChannel?: string;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<Supporter>>(`/api/supporters${query}`);
}

export function getSupporter(id: number) {
  return apiFetch<Supporter>(`/api/supporters/${id}`);
}

export function addSupporter(data: Partial<Supporter>) {
  return apiFetch<Supporter>('/api/supporters', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSupporter(id: number, data: Partial<Supporter>) {
  return apiFetch<Supporter>(`/api/supporters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
