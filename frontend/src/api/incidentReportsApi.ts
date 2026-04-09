import type { IncidentReport } from '../types/IncidentReport';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchIncidents(params: {
  pageSize: number;
  pageIndex: number;
  residentId?: number;
  safehouseId?: number;
  severity?: string;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<IncidentReport>>(`/api/incident-reports${query}`);
}

export function getIncident(id: number) {
  return apiFetch<IncidentReport>(`/api/incident-reports/${id}`);
}

export function addIncident(data: Partial<IncidentReport>) {
  return apiFetch<IncidentReport>('/api/incident-reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function resolveIncident(id: number, resolutionDate: string) {
  return apiFetch<void>(`/api/incident-reports/${id}/resolve`, {
    method: 'PUT',
    body: JSON.stringify({ resolutionDate }),
  });
}
