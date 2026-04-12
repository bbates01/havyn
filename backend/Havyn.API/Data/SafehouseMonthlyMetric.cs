using System.ComponentModel.DataAnnotations;

namespace Havyn.Data
{
    public class SafehouseMonthlyMetric
    {
        [Key]
        public int MetricId { get; set; }
        [Required]
        public int SafehouseId { get; set; }
        [Required]
        public DateOnly MonthStart { get; set; }
        [Required]
        public DateOnly MonthEnd { get; set; }
        [Required]
        public int ActiveResidents { get; set; }
        public float? AvgEducationProgress { get; set; }
        public float? AvgHealthScore { get; set; }
        [Required]
        public int ProcessRecordingCount { get; set; }
        [Required]
        public int HomeVisitationCount { get; set; }
        [Required]
        public int IncidentCount { get; set; }
        public string? Notes { get; set; }
    }
}
