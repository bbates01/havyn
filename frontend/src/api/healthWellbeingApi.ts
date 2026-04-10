import type { HealthWellbeingRecord } from '../types/HealthWellbeingRecord';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchHealthRecords(params: {
  pageSize: number;
  pageIndex: number;
  residentId?: number;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<HealthWellbeingRecord>>(`/api/HealthWellbeingRecords/AllRecords${query}`);
}

export function getHealthRecord(id: number) {
  return apiFetch<HealthWellbeingRecord>(`/api/HealthWellbeingRecords/GetRecord/${id}`);
}

export function addHealthRecord(data: Partial<HealthWellbeingRecord>) {
  return apiFetch<HealthWellbeingRecord>('/api/HealthWellbeingRecords/AddRecord', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateHealthRecord(id: number, data: Partial<HealthWellbeingRecord>) {
  return apiFetch<HealthWellbeingRecord>(`/api/HealthWellbeingRecords/UpdateRecord/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteHealthRecord(id: number) {
  return apiFetch<void>(`/api/HealthWellbeingRecords/DeleteRecord/${id}`, {
    method: 'DELETE',
  });
}
