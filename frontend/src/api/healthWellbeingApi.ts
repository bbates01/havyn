import type { HealthWellbeingRecord } from '../types/HealthWellbeingRecord';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchHealthRecords(params: {
  pageSize: number;
  pageIndex: number;
  residentId?: number;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<HealthWellbeingRecord>>(`/api/health-wellbeing${query}`);
}

export function addHealthRecord(data: Partial<HealthWellbeingRecord>) {
  return apiFetch<HealthWellbeingRecord>('/api/health-wellbeing', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
