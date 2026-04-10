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
  return apiFetch<PaginatedResponse<InterventionPlan>>(`/api/InterventionPlans/AllPlans${query}`);
}

export function getPlan(id: number) {
  return apiFetch<InterventionPlan>(`/api/InterventionPlans/GetPlan/${id}`);
}

export function addPlan(data: Partial<InterventionPlan>) {
  return apiFetch<InterventionPlan>('/api/InterventionPlans/AddPlan', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePlan(id: number, data: Partial<InterventionPlan>) {
  return apiFetch<InterventionPlan>(`/api/InterventionPlans/UpdatePlan/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deletePlan(id: number) {
  return apiFetch<void>(`/api/InterventionPlans/DeletePlan/${id}`, {
    method: 'DELETE',
  });
}
