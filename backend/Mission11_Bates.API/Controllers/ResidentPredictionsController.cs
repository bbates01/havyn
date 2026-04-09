using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class ResidentPredictionsController : ControllerBase
    {
        private HavynDbContext _context;

        public ResidentPredictionsController(HavynDbContext temp) => _context = temp;

        [HttpGet("All")]
        public IActionResult GetAll(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "OverallScore",
            string sortOrder = "desc",
            string? healthTag = null)
        {
            var query = _context.ResidentPredictions.AsQueryable();

            if (!string.IsNullOrEmpty(healthTag))
            {
                query = query.Where(p => p.HealthTag == healthTag);
            }

            query = sortBy switch
            {
                "OverallScore" => sortOrder == "desc" ? query.OrderByDescending(p => p.OverallScore) : query.OrderBy(p => p.OverallScore),
                "HealthProb" => sortOrder == "desc" ? query.OrderByDescending(p => p.HealthProb) : query.OrderBy(p => p.HealthProb),
                "EducationProb" => sortOrder == "desc" ? query.OrderByDescending(p => p.EducationProb) : query.OrderBy(p => p.EducationProb),
                "EmotionalProb" => sortOrder == "desc" ? query.OrderByDescending(p => p.EmotionalProb) : query.OrderBy(p => p.EmotionalProb),
                "PredictedAt" => sortOrder == "desc" ? query.OrderByDescending(p => p.PredictedAt) : query.OrderBy(p => p.PredictedAt),
                _ => sortOrder == "desc" ? query.OrderByDescending(p => p.OverallScore) : query.OrderBy(p => p.OverallScore)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetPrediction/{residentId}")]
        public IActionResult GetPrediction(int residentId)
        {
            var prediction = _context.ResidentPredictions.Find(residentId);

            if (prediction == null)
            {
                return NotFound(new { message = "Prediction not found for this resident" });
            }

            return Ok(prediction);
        }

        [HttpPost("AddPrediction")]
        public IActionResult AddPrediction([FromBody] ResidentPrediction newPrediction)
        {
            _context.ResidentPredictions.Add(newPrediction);
            _context.SaveChanges();
            return Ok(newPrediction);
        }

        [HttpPut("UpdatePrediction/{residentId}")]
        public IActionResult UpdatePrediction(int residentId, [FromBody] ResidentPrediction updatedPrediction)
        {
            var existing = _context.ResidentPredictions.Find(residentId);

            if (existing == null)
            {
                return NotFound(new { message = "Prediction not found for this resident" });
            }

            existing.HealthProb = updatedPrediction.HealthProb;
            existing.EducationProb = updatedPrediction.EducationProb;
            existing.EmotionalProb = updatedPrediction.EmotionalProb;
            existing.OverallScore = updatedPrediction.OverallScore;
            existing.HealthTag = updatedPrediction.HealthTag;
            existing.PredictedAt = updatedPrediction.PredictedAt;
            existing.ModelVersion = updatedPrediction.ModelVersion;

            _context.ResidentPredictions.Update(existing);
            _context.SaveChanges();

            return Ok(existing);
        }

        [HttpDelete("DeletePrediction/{residentId}")]
        public IActionResult DeletePrediction(int residentId)
        {
            var existing = _context.ResidentPredictions.Find(residentId);

            if (existing == null)
            {
                return NotFound(new { message = "Prediction not found for this resident" });
            }

            _context.ResidentPredictions.Remove(existing);
            _context.SaveChanges();

            return NoContent();
        }
    }
}
