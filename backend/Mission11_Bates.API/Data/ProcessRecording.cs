using System.ComponentModel.DataAnnotations;

namespace Mission11_Bates.Data
{
    public class ProcessRecording
    {
        [Key]
        public int RecordingId { get; set; }
        [Required]
        public int ResidentId { get; set; }
        [Required]
        public DateOnly SessionDate { get; set; }
        [Required]
        public string SocialWorker { get; set; }
        [Required]
        public string SessionType { get; set; }
        [Required]
        public int SessionDurationMinutes { get; set; }
        [Required]
        public string EmotionalStateObserved { get; set; }
        [Required]
        public string EmotionalStateEnd { get; set; }
        [Required]
        public string SessionNarrative { get; set; }
        [Required]
        public string InterventionsApplied { get; set; }
        [Required]
        public string FollowUpActions { get; set; }
        [Required]
        public bool ProgressNoted { get; set; }
        [Required]
        public bool ConcernsFlagged { get; set; }
        [Required]
        public bool ReferralMade { get; set; }
        public string? NotesRestricted { get; set; }
    }
}
