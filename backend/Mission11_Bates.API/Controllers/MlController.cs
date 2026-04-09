using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [ApiController]
    [Route("api/ml")]
    public class MlController : ControllerBase
    {
        private readonly HavynDbContext _context;

        public MlController(HavynDbContext context)
        {
            _context = context;
        }

        // Group 1: Progress Models
        // GET /api/ml/predictions
        [HttpGet("predictions")]
        public async Task<IActionResult> GetAllPredictions()
        {
            try
            {
                var items = await _context.ResidentPredictions
                    .OrderBy(p => p.OverallScore == null ? 1 : 0)
                    .ThenBy(p => p.OverallScore)
                    .ToListAsync();

                foreach (var p in items)
                {
                    if (p.HealthProb.HasValue && !double.IsFinite(p.HealthProb.Value))
                        p.HealthProb = null;
                    if (p.EducationProb.HasValue && !double.IsFinite(p.EducationProb.Value))
                        p.EducationProb = null;
                    if (p.EmotionalProb.HasValue && !double.IsFinite(p.EmotionalProb.Value))
                        p.EmotionalProb = null;
                    if (p.OverallScore.HasValue && !double.IsFinite(p.OverallScore.Value))
                        p.OverallScore = null;
                }

                return Ok(items);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }

        // GET /api/ml/predictions/{residentId}
        [HttpGet("predictions/{residentId:int}")]
        public IActionResult GetPrediction(int residentId)
        {
            var prediction = _context.ResidentPredictions.Find(residentId);
            if (prediction == null)
            {
                return NotFound(new { message = "Prediction not found for this resident" });
            }

            return Ok(prediction);
        }

        // Group 2: Partner Models
        // GET /api/ml/incident-risk
        [HttpGet("incident-risk")]
        public IActionResult GetAllIncidentRisk()
        {
            var items = _context.ResidentIncidentRisk
                .OrderBy(r => r.ResidentId)
                .ToList();

            return Ok(items);
        }

        // GET /api/ml/incident-risk/{residentId}
        [HttpGet("incident-risk/{residentId:int}")]
        public IActionResult GetIncidentRisk(int residentId)
        {
            var row = _context.ResidentIncidentRisk.Find(residentId);
            if (row == null)
            {
                return NotFound(new { message = "Incident risk not found for this resident" });
            }

            return Ok(row);
        }

        // GET /api/ml/model-meta
        [HttpGet("model-meta")]
        public IActionResult GetModelMeta()
        {
            // Expected single-row table; take latest if multiple exist.
            var meta = _context.MlModelMeta
                .OrderByDescending(m => m.UpdatedAt)
                .FirstOrDefault();

            if (meta == null)
            {
                return NotFound(new { message = "ML model meta not found" });
            }

            return Ok(meta);
        }
    }
}

