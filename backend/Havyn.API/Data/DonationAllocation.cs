using System.ComponentModel.DataAnnotations;

namespace Havyn.Data
{
    public class DonationAllocation
    {
        [Key]
        public int AllocationId { get; set; }
        [Required]
        public int DonationId { get; set; }
        [Required]
        public int SafehouseId { get; set; }
        [Required]
        public string ProgramArea { get; set; }
        [Required]
        public float AmountAllocated { get; set; }
        [Required]
        public DateOnly AllocationDate { get; set; }
        public string? AllocationNotes { get; set; }
    }
}
