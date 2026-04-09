import type { Partner } from '../types/Partner';
import type { PartnerAssignment } from '../types/PartnerAssignment';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchPartners(params: {
  pageSize: number;
  pageIndex: number;
  roleType?: string;
  region?: string;
  status?: string;
  safehouseId?: number;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<Partner>>(`/api/partners${query}`);
}

export function getPartner(id: number) {
  return apiFetch<Partner>(`/api/partners/${id}`);
}

export function addPartner(data: Partial<Partner>) {
  return apiFetch<Partner>('/api/partners', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePartner(id: number, data: Partial<Partner>) {
  return apiFetch<Partner>(`/api/partners/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function addAssignment(partnerId: number, data: Partial<PartnerAssignment>) {
  return apiFetch<PartnerAssignment>(`/api/partners/${partnerId}/assignments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAssignment(
  partnerId: number,
  assignmentId: number,
  data: Partial<PartnerAssignment>
) {
  return apiFetch<PartnerAssignment>(
    `/api/partners/${partnerId}/assignments/${assignmentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
}
