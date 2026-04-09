import type { ResidentRiskPrediction } from '../types/ResidentRiskPrediction';
import type { RecommendedSession } from '../types/RecommendedSession';
import type { DonorChurnRisk } from '../types/DonorChurnRisk';
import { apiFetch } from './apiHelper';

export function fetchResidentRiskPrediction(residentId: number) {
  return apiFetch<ResidentRiskPrediction>(`/api/predictions/resident-risk/${residentId}`);
}

export function fetchRecommendedSessions(residentId: number) {
  return apiFetch<RecommendedSession[]>(`/api/predictions/recommended-sessions/${residentId}`);
}

export function fetchDonorChurnRisk(supporterId: number) {
  return apiFetch<DonorChurnRisk>(`/api/predictions/donor-churn/${supporterId}`);
}
