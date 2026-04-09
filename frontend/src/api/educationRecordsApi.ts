import type { EducationRecord } from '../types/EducationRecord';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchEducationRecords(params: {
  pageSize: number;
  pageIndex: number;
  residentId?: number;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<EducationRecord>>(`/api/education-records${query}`);
}

export function addEducationRecord(data: Partial<EducationRecord>) {
  return apiFetch<EducationRecord>('/api/education-records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
