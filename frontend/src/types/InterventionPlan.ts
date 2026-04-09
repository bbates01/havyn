export interface InterventionPlan {
  planId: number,
  residentId: number,
  planCategory: string,
  planDescription: string,
  servicesProvided: string,
  targetValue: number,
  targetDate: string,
  status: string,
  caseConferenceDate?: string | null,
  createdAt: string,
  updatedAt: string,
}
