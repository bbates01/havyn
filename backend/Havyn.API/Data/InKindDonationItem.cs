using System.ComponentModel.DataAnnotations;

namespace Havyn.Data
{
    public class InKindDonationItem
    {
        [Key]
        public int ItemId { get; set; }
        [Required]
        public int DonationId { get; set; }
        [Required]
        public string ItemName { get; set; }
        [Required]
        public string ItemCategory { get; set; }
        [Required]
        public int Quantity { get; set; }
        [Required]
        public string UnitOfMeasure { get; set; }
        [Required]
        public float EstimatedUnitValue { get; set; }
        [Required]
        public string IntendedUse { get; set; }
        [Required]
        public string ReceivedCondition { get; set; }
    }
}
