using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace Mission11_Bates.Data
{
    [Table("ResidentIncidentRisk")]
    public class ResidentIncidentRisk
    {
        [Key]
        public int ResidentId { get; set; }

        public string? RiskTier { get; set; }

        public bool FlaggedForReview { get; set; }

        // Stored as JSONB array of strings in Postgres.
        [Column(TypeName = "jsonb")]
        public JsonElement? TopRiskFactors { get; set; }

        public DateTime? ScoredAt { get; set; }
    }
}

