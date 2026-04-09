using System.ComponentModel.DataAnnotations;

namespace Mission11_Bates.Data
{
    public class TodoItem
    {
        [Key]
        public int TodoId { get; set; }
        [Required]
        public string UserId { get; set; }
        [Required]
        [MaxLength(500)]
        public string TaskText { get; set; }
        [Required]
        public bool IsCompleted { get; set; }
        [Required]
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        [Required]
        public int DisplayOrder { get; set; }
    }
}
