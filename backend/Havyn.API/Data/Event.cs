using System.ComponentModel.DataAnnotations;

namespace Havyn.Data
{
    public class Event
    {
        [Key]
        public int EventId { get; set; }
        [Required]
        public string EventType { get; set; }
        [Required]
        public string Title { get; set; }
        public string? Description { get; set; }
        [Required]
        public DateOnly EventDate { get; set; }
        [Required]
        public string EventTime { get; set; }  // stored as text (e.g. "14:30")
        public int? SafehouseId { get; set; }
        [Required]
        public string CreatedByUserId { get; set; }
        [Required]
        public string Status { get; set; }
        [Required]
        public DateTime CreatedAt { get; set; }
        [Required]
        public DateTime UpdatedAt { get; set; }
    }
}
