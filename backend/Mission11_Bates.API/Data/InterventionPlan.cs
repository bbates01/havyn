using System.ComponentModel.DataAnnotations;

namespace Mission11_Bates.Data
{
    public class InterventionPlan
    {
        [Key]
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
