export interface PublicImpactSnapshot {
  snapshotId: number,
  snapshotDate: string,
  headline: string,
  summaryText: string,
  metricPayloadJson: string,
  isPublished: boolean,
  publishedAt?: string | null,
}
