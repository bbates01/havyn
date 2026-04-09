export interface Partner {
  partnerId: number,
  partnerName: string,
  partnerType: string,
  roleType: string,
  contactName: string,
  email: string,
  phone: string,
  region: string,
  status: string,
  startDate: string,
  endDate?: string | null,
  notes?: string | null,
}
