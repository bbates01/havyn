using System.ComponentModel.DataAnnotations;

namespace Mission11_Bates.Data
{
    public class EducationRecord
    {
        [Key]
        public int EducationRecordId { get; set; }
        [Required]
        public int ResidentId { get; set; }
        [Required]
        public DateOnly RecordDate { get; set; }
        [Required]
        public string EducationLevel { get; set; }
        [Required]
        public string SchoolName { get; set; }
        [Required]
        public string EnrollmentStatus { get; set; }
        [Required]
        public float AttendanceRate { get; set; }
        [Required]
        public float ProgressPercent { get; set; }
        [Required]
        public string CompletionStatus { get; set; }
        public string? Notes { get; set; }
    }
}
