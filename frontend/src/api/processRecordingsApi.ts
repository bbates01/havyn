import type { ProcessRecording } from '../types/ProcessRecording';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchRecordings(params: {
  pageSize: number;
  pageIndex: number;
  residentId?: number;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<ProcessRecording>>(`/api/process-recordings${query}`);
}

export function getRecording(id: number) {
  return apiFetch<ProcessRecording>(`/api/process-recordings/${id}`);
}

export function addRecording(data: Partial<ProcessRecording>) {
  return apiFetch<ProcessRecording>('/api/process-recordings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
