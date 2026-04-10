import type { EducationRecord } from '../types/EducationRecord';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchEducationRecords(params: {
  pageSize: number;
  pageIndex: number;
  residentId?: number;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<EducationRecord>>(`/api/EducationRecords/AllRecords${query}`);
}

export function getEducationRecord(id: number) {
  return apiFetch<EducationRecord>(`/api/EducationRecords/GetRecord/${id}`);
}

export function addEducationRecord(data: Partial<EducationRecord>) {
  return apiFetch<EducationRecord>('/api/EducationRecords/AddRecord', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateEducationRecord(id: number, data: Partial<EducationRecord>) {
  return apiFetch<EducationRecord>(`/api/EducationRecords/UpdateRecord/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteEducationRecord(id: number) {
  return apiFetch<void>(`/api/EducationRecords/DeleteRecord/${id}`, {
    method: 'DELETE',
  });
}
