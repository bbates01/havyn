export interface DonorChurnRisk {
  supporterId: number,
  churnProbability: number,
  riskLevel: string,
  daysSinceLastDonation?: number | null,
  predictedAt?: string | null,
  modelVersion?: string | null,
}
