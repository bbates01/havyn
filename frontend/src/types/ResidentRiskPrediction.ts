export interface ResidentRiskPrediction {
  residentId: number,
  healthProb?: number | null,
  educationProb?: number | null,
  emotionalProb?: number | null,
  overallScore?: number | null,
  healthTag?: string | null,
  predictedAt?: string | null,
  modelVersion?: string | null,
}
