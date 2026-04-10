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
    public class InterventionPlansController : ControllerBase
    {
        private readonly HavynDbContext _context;
        private readonly IResidentAccessService _residentAccess;

        public InterventionPlansController(HavynDbContext context, IResidentAccessService residentAccess)
        {
            _context = context;
            _residentAccess = residentAccess;
        }

        [HttpGet("AllPlans")]
        public async Task<IActionResult> GetAllPlans(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "CreatedAt",
            string sortOrder = "desc",
            int? residentId = null,
            string? caseConferenceDate = null,
            [FromQuery] List<string>? planCategories = null,
            [FromQuery] List<string>? statuses = null)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var allowedIds = _residentAccess.ResidentIdsInScope(_context, scope);
            var query = _context.InterventionPlans.AsQueryable().Where(ip => allowedIds.Contains(ip.ResidentId));

            if (residentId.HasValue)
                query = query.Where(ip => ip.ResidentId == residentId.Value);

            if (!string.IsNullOrEmpty(caseConferenceDate))
            {
                var confDate = DateOnly.Parse(caseConferenceDate);
                query = query.Where(ip => ip.CaseConferenceDate == confDate);
            }

            if (planCategories != null && planCategories.Any())
                query = query.Where(ip => planCategories.Contains(ip.PlanCategory));

            if (statuses != null && statuses.Any())
                query = query.Where(ip => statuses.Contains(ip.Status));

            query = sortBy switch
            {
                "CreatedAt" => sortOrder == "desc" ? query.OrderByDescending(ip => ip.CreatedAt) : query.OrderBy(ip => ip.CreatedAt),
                "TargetDate" => sortOrder == "desc" ? query.OrderByDescending(ip => ip.TargetDate) : query.OrderBy(ip => ip.TargetDate),
                "PlanCategory" => sortOrder == "desc" ? query.OrderByDescending(ip => ip.PlanCategory) : query.OrderBy(ip => ip.PlanCategory),
                "Status" => sortOrder == "desc" ? query.OrderByDescending(ip => ip.Status) : query.OrderBy(ip => ip.Status),
                _ => sortOrder == "desc" ? query.OrderByDescending(ip => ip.CreatedAt) : query.OrderBy(ip => ip.CreatedAt)
            };

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetPlan/{planId}")]
        public async Task<IActionResult> GetPlan(int planId)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var plan = await _context.InterventionPlans.FindAsync(planId);
            if (plan == null)
                return NotFound(new { message = "Intervention plan not found" });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, plan.ResidentId))
                return NotFound(new { message = "Intervention plan not found" });

            return Ok(plan);
        }

        [HttpPost("AddPlan")]
        public async Task<IActionResult> AddPlan([FromBody] InterventionPlan newPlan)
        {
            // Assign PlanId explicitly (DB column is NOT auto-generated).
            newPlan.PlanId = (_context.InterventionPlans.Max(p => (int?)p.PlanId) ?? 0) + 1;
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, newPlan.ResidentId))
                return StatusCode(403, new { message = "Not authorized for this resident." });

            _context.InterventionPlans.Add(newPlan);
            await _context.SaveChangesAsync();
            return Ok(newPlan);
        }

        [HttpPut("UpdatePlan/{planId}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> UpdatePlan(int planId, [FromBody] InterventionPlan updatedPlan)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var existing = await _context.InterventionPlans.FindAsync(planId);
            if (existing == null)
                return NotFound(new { message = "Intervention plan not found" });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, existing.ResidentId))
                return NotFound(new { message = "Intervention plan not found" });

            if (updatedPlan.ResidentId != existing.ResidentId && scope.Kind != ResidentScopeKind.Unrestricted)
                return BadRequest(new { message = "Cannot move a plan to another resident." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, updatedPlan.ResidentId))
                return StatusCode(403, new { message = "Not authorized for this resident." });

            existing.ResidentId = updatedPlan.ResidentId;
            existing.PlanCategory = updatedPlan.PlanCategory;
            existing.PlanDescription = updatedPlan.PlanDescription;
            existing.ServicesProvided = updatedPlan.ServicesProvided;
            existing.TargetValue = updatedPlan.TargetValue;
            existing.TargetDate = updatedPlan.TargetDate;
            existing.Status = updatedPlan.Status;
            existing.CaseConferenceDate = updatedPlan.CaseConferenceDate;
            existing.UpdatedAt = updatedPlan.UpdatedAt;

            _context.InterventionPlans.Update(existing);
            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        [HttpDelete("DeletePlan/{planId}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> DeletePlan(int planId)
        {
            var existing = await _context.InterventionPlans.FindAsync(planId);
            if (existing == null)
                return NotFound(new { message = "Intervention plan not found" });

            _context.InterventionPlans.Remove(existing);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
