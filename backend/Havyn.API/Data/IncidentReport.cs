using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Havyn.Data
{
    public class IncidentReport
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int IncidentId { get; set; }
        [Required]
        public int ResidentId { get; set; }
        [Required]
        public int SafehouseId { get; set; }
        [Required]
        public DateOnly IncidentDate { get; set; }
        [Required]
        public string IncidentType { get; set; }
        [Required]
        public string Severity { get; set; }
        [Required]
        public string Description { get; set; }
        [Required]
        public string ResponseTaken { get; set; }
        [Required]
        public bool Resolved { get; set; }
        public DateOnly? ResolutionDate { get; set; }
        [Required]
        public string ReportedBy { get; set; }
        [Required]
        public bool FollowUpRequired { get; set; }
    }
}
