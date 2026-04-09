import type { Safehouse } from '../types/Safehouse';
import type { SafehouseMetrics } from '../types/SafehouseMetrics';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchSafehouses(params: { includeInactive?: boolean } = {}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<Safehouse[]>(`/api/safehouses${query}`);
}

export function getSafehouse(id: number) {
  return apiFetch<Safehouse>(`/api/safehouses/${id}`);
}

export function updateSafehouse(id: number, data: Partial<Safehouse>) {
  return apiFetch<Safehouse>(`/api/safehouses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function fetchSafehouseMetrics(
  safehouseId: number,
  params: { from?: string; to?: string } = {}
) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<SafehouseMetrics>(`/api/safehouses/${safehouseId}/metrics${query}`);
}
