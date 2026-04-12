using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Havyn.Data
{
    public class InterventionPlan
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int PlanId { get; set; }
        [Required]
        public int ResidentId { get; set; }
        [Required]
        public string PlanCategory { get; set; }
        [Required]
        public string PlanDescription { get; set; }
        [Required]
        public string ServicesProvided { get; set; }
        [Required]
        public float TargetValue { get; set; }
        [Required]
        public DateOnly TargetDate { get; set; }
        [Required]
        public string Status { get; set; }
        public DateOnly? CaseConferenceDate { get; set; }
        [Required]
        public DateTime CreatedAt { get; set; }
        [Required]
        public DateTime UpdatedAt { get; set; }
    }
}
