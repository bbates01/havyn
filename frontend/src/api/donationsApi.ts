import type { Donation } from '../types/Donation';
import type { InKindItem } from '../types/InKindItem';
import type { DonationAllocation } from '../types/DonationAllocation';
import type { PaginatedResponse } from '../types/PaginatedResponse';
import { apiFetch, buildQuery } from './apiHelper';

export function fetchDonations(params: {
  pageSize: number;
  pageIndex: number;
  supporterId?: number;
  donationType?: string;
  campaign?: string;
  channel?: string;
  isRecurring?: boolean;
  dateFrom?: string;
  dateTo?: string;
}) {
  const query = buildQuery(params as Record<string, string | number | boolean | undefined>);
  return apiFetch<PaginatedResponse<Donation>>(`/api/donations${query}`);
}

export function getDonation(id: number) {
  return apiFetch<Donation>(`/api/donations/${id}`);
}

export function addDonation(data: Partial<Donation>) {
  return apiFetch<Donation>('/api/donations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function addInKindItems(donationId: number, items: Partial<InKindItem>[]) {
  return apiFetch<void>(`/api/donations/${donationId}/in-kind-items`, {
    method: 'POST',
    body: JSON.stringify(items),
  });
}

export function addAllocation(donationId: number, data: Partial<DonationAllocation>) {
  return apiFetch<DonationAllocation>(`/api/donations/${donationId}/allocations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchDonorHistory(supporterId: number) {
  return apiFetch<Donation[]>(`/api/donations/history/${supporterId}`);
}
