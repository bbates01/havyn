using System.ComponentModel.DataAnnotations;

namespace Havyn.Data
{
    public class HomeVisitation
    {
        [Key]
        public int VisitationId { get; set; }
        [Required]
        public int ResidentId { get; set; }
        [Required]
        public DateOnly VisitDate { get; set; }
        [Required]
        public string SocialWorker { get; set; }
        [Required]
        public string VisitType { get; set; }
        [Required]
        public string LocationVisited { get; set; }
        [Required]
        public string FamilyMembersPresent { get; set; }
        [Required]
        public string Purpose { get; set; }
        [Required]
        public string Observations { get; set; }
        [Required]
        public string FamilyCooperationLevel { get; set; }
        [Required]
        public bool SafetyConcernsNoted { get; set; }
        [Required]
        public bool FollowUpNeeded { get; set; }
        public string? FollowUpNotes { get; set; }
        [Required]
        public string VisitOutcome { get; set; }
    }
}
