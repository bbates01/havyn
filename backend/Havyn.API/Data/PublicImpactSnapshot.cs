using System.ComponentModel.DataAnnotations;

namespace Havyn.Data
{
    public class PublicImpactSnapshot
    {
        [Key]
        public int SnapshotId { get; set; }
        [Required]
        public DateOnly SnapshotDate { get; set; }
        [Required]
        public string Headline { get; set; }
        [Required]
        public string SummaryText { get; set; }
        [Required]
        public string MetricPayloadJson { get; set; }
        [Required]
        public bool IsPublished { get; set; }
        public DateTime? PublishedAt { get; set; }
    }
}
