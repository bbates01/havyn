import type { ProcessRecording } from '../types/ProcessRecording';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export async function fetchRecordings(params: {
  pageSize: number;
  pageIndex: number;
  sortBy?: string;
  sortOrder?: string;
  residentId?: number;
  socialWorker?: string;
}): Promise<PaginatedResponse<ProcessRecording>> {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  const data = await apiFetch<{
    items?: ProcessRecording[];
    Items?: ProcessRecording[];
    totalCount?: number;
    TotalCount?: number;
  }>(`/api/ProcessRecordings/AllRecordings${query}`);
  return {
    items: data.items ?? data.Items ?? [],
    totalCount: data.totalCount ?? data.TotalCount ?? 0,
  };
}

export function getRecording(id: number) {
  return apiFetch<ProcessRecording>(`/api/ProcessRecordings/GetRecording/${id}`);
}

export function addRecording(data: Partial<ProcessRecording>) {
  return apiFetch<ProcessRecording>('/api/ProcessRecordings/AddRecording', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateRecording(id: number, data: Partial<ProcessRecording>) {
  return apiFetch<ProcessRecording>(`/api/ProcessRecordings/UpdateRecording/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
