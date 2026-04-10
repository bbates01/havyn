import type { Resident } from '../types/Resident';
import { apiFetch, buildQuery } from './apiHelper';

export interface SocialWorkerOption {
  workerCode: string;
  displayName: string;
}

export async function fetchResidents(params: {
  pageSize: number;
  pageIndex: number;
  status?: string;
  safehouseId?: number;
  riskLevel?: string;
  caseCategory?: string;
  assignedWorker?: string;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  const data = await apiFetch<{
    items?: Resident[];
    Items?: Resident[];
    totalCount?: number;
    TotalCount?: number;
  }>(`/api/Residents/AllResidents${query}`);
  return {
    items: data.items ?? data.Items ?? [],
    totalCount: data.totalCount ?? data.TotalCount ?? 0,
  };
}

export function getResident(id: number) {
  return apiFetch<Resident>(`/api/Residents/GetResident/${id}`);
}

export function addResident(data: Partial<Resident>) {
  return apiFetch<Resident>('/api/Residents/AddResident', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateResident(id: number, data: Partial<Resident>) {
  return apiFetch<Resident>(`/api/Residents/UpdateResident/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function fetchSocialWorkers() {
  return apiFetch<SocialWorkerOption[]>('/api/Residents/SocialWorkers');
}
