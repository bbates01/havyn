using System.ComponentModel.DataAnnotations;

namespace Mission11_Bates.Data
{
    public class Safehouse
    {
        [Key]
        public int SafehouseId { get; set; }
        [Required]
        public string SafehouseCode { get; set; }
        [Required]
        public string Name { get; set; }
        [Required]
        public string Region { get; set; }
        [Required]
        public string City { get; set; }
        [Required]
        public string Province { get; set; }
        [Required]
        public string Country { get; set; }
        [Required]
        public DateOnly OpenDate { get; set; }
        [Required]
        public string Status { get; set; }
        [Required]
        public int CapacityGirls { get; set; }
        [Required]
        public int CapacityStaff { get; set; }
        [Required]
        public int CurrentOccupancy { get; set; }
        public string? Notes { get; set; }
    }
}
