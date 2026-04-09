using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace Mission11_Bates.Data
{
    [Table("MlModelMeta")]
    public class MlModelMeta
    {
        [Key]
        public int Id { get; set; }

        [Column(TypeName = "jsonb")]
        public JsonElement? IncidentRiskFactors { get; set; }

        [Column(TypeName = "jsonb")]
        public JsonElement? SocialMediaRecs { get; set; }

        [Column(TypeName = "jsonb")]
        public JsonElement? ReintegrationModel { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}

