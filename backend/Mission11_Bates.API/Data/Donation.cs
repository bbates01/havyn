using System.ComponentModel.DataAnnotations;

namespace Mission11_Bates.Data
{
    public class Donation
    {
        [Key]
        public int DonationId { get; set; }
        [Required]
        public int SupporterId { get; set; }
        [Required]
        public string DonationType { get; set; }
        [Required]
        public DateOnly DonationDate { get; set; }
        [Required]
        public bool IsRecurring { get; set; }
        public string? CampaignName { get; set; }
        [Required]
        public string ChannelSource { get; set; }
        public string? CurrencyCode { get; set; }
        public float? Amount { get; set; }
        [Required]
        public float EstimatedValue { get; set; }
        [Required]
        public string ImpactUnit { get; set; }
        public string? Notes { get; set; }
        public int? ReferralPostId { get; set; }
    }
}
