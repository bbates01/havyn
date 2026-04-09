import type { InterventionPlan } from '../types/InterventionPlan';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchPlans(params: {
  pageSize: number;
  pageIndex: number;
  residentId?: number;
  status?: string;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<InterventionPlan>>(`/api/intervention-plans${query}`);
}

export function getPlan(id: number) {
  return apiFetch<InterventionPlan>(`/api/intervention-plans/${id}`);
}

export function addPlan(data: Partial<InterventionPlan>) {
  return apiFetch<InterventionPlan>('/api/intervention-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePlan(id: number, data: Partial<InterventionPlan>) {
  return apiFetch<InterventionPlan>(`/api/intervention-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
