namespace Mission11_Bates.Dtos
{
    /// <summary>JSON shape for donor portal lists (projected in SQL; avoids materializing nullable DB strings into non-nullable entity properties).</summary>
    public class DonorMyDonationRowDto
    {
        public int DonationId { get; set; }
        public int SupporterId { get; set; }
        public string DonationType { get; set; } = "";
        public DateOnly DonationDate { get; set; }
        public bool IsRecurring { get; set; }
        public string? RecurringFrequency { get; set; }
        public string? CampaignName { get; set; }
        public string ChannelSource { get; set; } = "";
        public string? CurrencyCode { get; set; }
        public float? Amount { get; set; }
        public float EstimatedValue { get; set; }
        public string ImpactUnit { get; set; } = "";
        public string? Notes { get; set; }
        public int? ReferralPostId { get; set; }
    }

    public class DonorCreateDonationDto
    {
        public decimal Amount { get; set; }
        public bool IsRecurring { get; set; }
        public string? RecurringFrequency { get; set; }
        public string? CampaignName { get; set; }
        public string? Notes { get; set; }
    }

    public class DonorUpdateDonationDto
    {
        public bool IsRecurring { get; set; }
        public string? RecurringFrequency { get; set; }
        public decimal? Amount { get; set; }
        public string? Notes { get; set; }
    }
}
