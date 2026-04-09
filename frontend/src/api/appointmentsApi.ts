import type { Appointment } from '../types/Appointment';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchAppointments(params: {
  pageSize: number;
  pageIndex: number;
  staffUserId?: number;
  residentId?: number;
  status?: string;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<Appointment>>(`/api/appointments${query}`);
}

export function addAppointment(data: Partial<Appointment>) {
  return apiFetch<Appointment>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAppointment(id: number, data: Partial<Appointment>) {
  return apiFetch<Appointment>(`/api/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function cancelAppointment(id: number) {
  return apiFetch<void>(`/api/appointments/${id}/cancel`, { method: 'PUT' });
}
