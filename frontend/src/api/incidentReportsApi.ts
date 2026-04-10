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
  return apiFetch<PaginatedResponse<IncidentReport>>(`/api/IncidentReports/AllIncidents${query}`);
}

export function getIncident(id: number) {
  return apiFetch<IncidentReport>(`/api/IncidentReports/GetIncident/${id}`);
}

export function addIncident(data: Partial<IncidentReport>) {
  return apiFetch<IncidentReport>('/api/IncidentReports/AddIncident', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateIncident(id: number, data: Partial<IncidentReport>) {
  return apiFetch<IncidentReport>(`/api/IncidentReports/UpdateIncident/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteIncident(id: number) {
  return apiFetch<void>(`/api/IncidentReports/DeleteIncident/${id}`, {
    method: 'DELETE',
  });
}
