using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mission11_Bates.Data
{
    [Table("ResidentPredictions")]
    public class ResidentPrediction
    {
        [Key]
        public int ResidentId { get; set; }
        public double? HealthProb { get; set; }
        public double? EducationProb { get; set; }
        public double? EmotionalProb { get; set; }
        public double? OverallScore { get; set; }
        public string? HealthTag { get; set; }
        public DateTime? PredictedAt { get; set; }
        public string? ModelVersion { get; set; }
    }
}
