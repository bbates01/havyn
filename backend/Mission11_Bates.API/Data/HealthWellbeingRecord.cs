using System.ComponentModel.DataAnnotations;

namespace Mission11_Bates.Data
{
    public class HealthWellbeingRecord
    {
        [Key]
        public int HealthRecordId { get; set; }
        [Required]
        public int ResidentId { get; set; }
        [Required]
        public DateOnly RecordDate { get; set; }
        [Required]
        public float GeneralHealthScore { get; set; }
        [Required]
        public float NutritionScore { get; set; }
        [Required]
        public float SleepQualityScore { get; set; }
        [Required]
        public float EnergyLevelScore { get; set; }
        [Required]
        public float HeightCm { get; set; }
        [Required]
        public float WeightKg { get; set; }
        [Required]
        public float Bmi { get; set; }
        [Required]
        public bool MedicalCheckupDone { get; set; }
        [Required]
        public bool DentalCheckupDone { get; set; }
        [Required]
        public bool PsychologicalCheckupDone { get; set; }
        public string? Notes { get; set; }
    }
}
