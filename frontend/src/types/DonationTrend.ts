export interface DonationTrend {
  monthlyTotals: { month: string, totalAmount: number, count: number }[],
  byCampaign: { campaign: string | null, totalValue: number, count: number }[],
  totalDonors: number,
  recurringDonors: number,
  oneTimeDonors: number,
}
