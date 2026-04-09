import type { HomeVisitation } from '../types/HomeVisitation';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchVisitations(params: {
  pageSize: number;
  pageIndex: number;
  residentId?: number;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<HomeVisitation>>(`/api/home-visitations${query}`);
}

export function getVisitation(id: number) {
  return apiFetch<HomeVisitation>(`/api/home-visitations/${id}`);
}

export function addVisitation(data: Partial<HomeVisitation>) {
  return apiFetch<HomeVisitation>('/api/home-visitations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
