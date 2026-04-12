using System.ComponentModel.DataAnnotations;

namespace Havyn.Data
{
    public class PartnerAssignment
    {
        [Key]
        public int AssignmentId { get; set; }
        [Required]
        public int PartnerId { get; set; }
        public float? SafehouseId { get; set; }
        [Required]
        public string ProgramArea { get; set; }
        [Required]
        public DateOnly AssignmentStart { get; set; }
        public DateOnly? AssignmentEnd { get; set; }
        public string? ResponsibilityNotes { get; set; }
        [Required]
        public bool IsPrimary { get; set; }
        [Required]
        public string Status { get; set; }
    }
}
