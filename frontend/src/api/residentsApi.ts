import type { Resident } from '../types/Resident';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchResidents(params: {
  pageSize: number;
  pageIndex: number;
  status?: string;
  safehouseId?: number;
  riskLevel?: string;
  caseCategory?: string;
  assignedWorker?: string;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<Resident>>(`/api/residents${query}`);
}

export function getResident(id: number) {
  return apiFetch<Resident>(`/api/residents/${id}`);
}

export function addResident(data: Partial<Resident>) {
  return apiFetch<Resident>('/api/residents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateResident(id: number, data: Partial<Resident>) {
  return apiFetch<Resident>(`/api/residents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function closeCase(id: number) {
  return apiFetch<void>(`/api/residents/${id}/close`, { method: 'PUT' });
}

export function reopenCase(id: number) {
  return apiFetch<void>(`/api/residents/${id}/reopen`, { method: 'PUT' });
}
