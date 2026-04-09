using System.ComponentModel.DataAnnotations;

namespace Mission11_Bates.Data
{
    public class Appointment
    {
        [Key]
        public int AppointmentId { get; set; }
        [Required]
        public string StaffUserId { get; set; }
        [Required]
        public int ResidentId { get; set; }
        [Required]
        public DateOnly AppointmentDate { get; set; }
        [Required]
        public string AppointmentTime { get; set; }  // stored as text (e.g. "14:30")
        [Required]
        public string AppointmentType { get; set; }
        [Required]
        public string SessionFormat { get; set; }
        public string? Location { get; set; }
        public string? Notes { get; set; }
        [Required]
        public string Status { get; set; }
        [Required]
        public DateTime CreatedAt { get; set; }
        [Required]
        public DateTime UpdatedAt { get; set; }
    }
}
