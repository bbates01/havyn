using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mission11_Bates.Data;
using Mission11_Bates.Services;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "CaseAccess")]
    public class ResidentPredictionsController : ControllerBase
    {
        private readonly HavynDbContext _context;
        private readonly IResidentAccessService _residentAccess;

        public ResidentPredictionsController(HavynDbContext context, IResidentAccessService residentAccess)
        {
            _context = context;
            _residentAccess = residentAccess;
        }

        [HttpGet("All")]
        public async Task<IActionResult> GetAll(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "OverallScore",
            string sortOrder = "desc",
            string? healthTag = null)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var allowedIds = _residentAccess.ResidentIdsInScope(_context, scope);
            var query = _context.ResidentPredictions.AsQueryable().Where(p => allowedIds.Contains(p.ResidentId));

            if (!string.IsNullOrEmpty(healthTag))
                query = query.Where(p => p.HealthTag == healthTag);

            query = sortBy switch
            {
                "OverallScore" => sortOrder == "desc" ? query.OrderByDescending(p => p.OverallScore) : query.OrderBy(p => p.OverallScore),
                "HealthProb" => sortOrder == "desc" ? query.OrderByDescending(p => p.HealthProb) : query.OrderBy(p => p.HealthProb),
                "EducationProb" => sortOrder == "desc" ? query.OrderByDescending(p => p.EducationProb) : query.OrderBy(p => p.EducationProb),
                "EmotionalProb" => sortOrder == "desc" ? query.OrderByDescending(p => p.EmotionalProb) : query.OrderBy(p => p.EmotionalProb),
                "PredictedAt" => sortOrder == "desc" ? query.OrderByDescending(p => p.PredictedAt) : query.OrderBy(p => p.PredictedAt),
                _ => sortOrder == "desc" ? query.OrderByDescending(p => p.OverallScore) : query.OrderBy(p => p.OverallScore)
            };

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetPrediction/{residentId}")]
        public async Task<IActionResult> GetPrediction(int residentId)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, residentId))
                return NotFound(new { message = "Prediction not found for this resident" });

            var prediction = await _context.ResidentPredictions.FindAsync(residentId);
            if (prediction == null)
                return NotFound(new { message = "Prediction not found for this resident" });

            return Ok(prediction);
        }

        [HttpPost("AddPrediction")]
        public async Task<IActionResult> AddPrediction([FromBody] ResidentPrediction newPrediction)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, newPrediction.ResidentId))
                return StatusCode(403, new { message = "Not authorized for this resident." });

            _context.ResidentPredictions.Add(newPrediction);
            await _context.SaveChangesAsync();
            return Ok(newPrediction);
        }

        [HttpPut("UpdatePrediction/{residentId}")]
        public async Task<IActionResult> UpdatePrediction(int residentId, [FromBody] ResidentPrediction updatedPrediction)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, residentId))
                return NotFound(new { message = "Prediction not found for this resident" });

            var existing = await _context.ResidentPredictions.FindAsync(residentId);
            if (existing == null)
                return NotFound(new { message = "Prediction not found for this resident" });

            existing.HealthProb = updatedPrediction.HealthProb;
            existing.EducationProb = updatedPrediction.EducationProb;
            existing.EmotionalProb = updatedPrediction.EmotionalProb;
            existing.OverallScore = updatedPrediction.OverallScore;
            existing.HealthTag = updatedPrediction.HealthTag;
            existing.PredictedAt = updatedPrediction.PredictedAt;
            existing.ModelVersion = updatedPrediction.ModelVersion;

            _context.ResidentPredictions.Update(existing);
            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        [HttpDelete("DeletePrediction/{residentId}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> DeletePrediction(int residentId)
        {
            var existing = await _context.ResidentPredictions.FindAsync(residentId);
            if (existing == null)
                return NotFound(new { message = "Prediction not found for this resident" });

            _context.ResidentPredictions.Remove(existing);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
