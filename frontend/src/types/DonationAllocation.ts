export interface DonationAllocation {
  allocationId: number,
  donationId: number,
  safehouseId: number,
  programArea: string,
  amountAllocated: number,
  allocationDate: string,
  allocationNotes?: string | null,
}
