import type { HomeVisitation } from '../types/HomeVisitation';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export async function fetchVisitations(params: {
  pageSize: number;
  pageIndex: number;
  sortBy?: string;
  sortOrder?: string;
  residentId?: number;
  socialWorker?: string;
}): Promise<PaginatedResponse<HomeVisitation>> {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  const data = await apiFetch<{
    items?: HomeVisitation[];
    Items?: HomeVisitation[];
    totalCount?: number;
    TotalCount?: number;
  }>(`/api/HomeVisitations/AllVisitations${query}`);
  return {
    items: data.items ?? data.Items ?? [],
    totalCount: data.totalCount ?? data.TotalCount ?? 0,
  };
}

export function getVisitation(id: number) {
  return apiFetch<HomeVisitation>(`/api/HomeVisitations/GetVisitation/${id}`);
}

export function addVisitation(data: Partial<HomeVisitation>) {
  return apiFetch<HomeVisitation>('/api/HomeVisitations/AddVisitation', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateVisitation(id: number, data: Partial<HomeVisitation>) {
  return apiFetch<HomeVisitation>(`/api/HomeVisitations/UpdateVisitation/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteVisitation(id: number) {
  return apiFetch<void>(`/api/HomeVisitations/DeleteVisitation/${id}`, {
    method: 'DELETE',
  });
}
