using System.ComponentModel.DataAnnotations;

namespace Havyn.Data
{
    public class Partner
    {
        [Key]
        public int PartnerId { get; set; }
        [Required]
        public string PartnerName { get; set; }
        [Required]
        public string PartnerType { get; set; }
        [Required]
        public string RoleType { get; set; }
        [Required]
        public string ContactName { get; set; }
        [Required]
        public string Email { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string Region { get; set; } = string.Empty;
        [Required]
        public string Status { get; set; }
        [Required]
        public DateOnly StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string? Notes { get; set; }
    }
}
