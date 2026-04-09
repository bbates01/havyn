using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "CaseAccess")]
    public class InterventionPlansController : ControllerBase
    {
        private HavynDbContext _context;

        public InterventionPlansController(HavynDbContext temp) => _context = temp;

        [HttpGet("AllPlans")]
        public IActionResult GetAllPlans(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "CreatedAt",
            string sortOrder = "desc",
            int? residentId = null,
            string? caseConferenceDate = null,
            [FromQuery] List<string>? planCategories = null,
            [FromQuery] List<string>? statuses = null)
        {
            var query = _context.InterventionPlans.AsQueryable();

            if (residentId.HasValue)
            {
                query = query.Where(ip => ip.ResidentId == residentId.Value);
            }

            if (!string.IsNullOrEmpty(caseConferenceDate))
            {
                var confDate = DateOnly.Parse(caseConferenceDate);
                query = query.Where(ip => ip.CaseConferenceDate == confDate);
            }

            if (planCategories != null && planCategories.Any())
            {
                query = query.Where(ip => planCategories.Contains(ip.PlanCategory));
            }

            if (statuses != null && statuses.Any())
            {
                query = query.Where(ip => statuses.Contains(ip.Status));
            }

            query = sortBy switch
            {
                "CreatedAt" => sortOrder == "desc" ? query.OrderByDescending(ip => ip.CreatedAt) : query.OrderBy(ip => ip.CreatedAt),
                "TargetDate" => sortOrder == "desc" ? query.OrderByDescending(ip => ip.TargetDate) : query.OrderBy(ip => ip.TargetDate),
                "PlanCategory" => sortOrder == "desc" ? query.OrderByDescending(ip => ip.PlanCategory) : query.OrderBy(ip => ip.PlanCategory),
                "Status" => sortOrder == "desc" ? query.OrderByDescending(ip => ip.Status) : query.OrderBy(ip => ip.Status),
                _ => sortOrder == "desc" ? query.OrderByDescending(ip => ip.CreatedAt) : query.OrderBy(ip => ip.CreatedAt)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetPlan/{planId}")]
        public IActionResult GetPlan(int planId)
        {
            var plan = _context.InterventionPlans.Find(planId);

            if (plan == null)
            {
                return NotFound(new { message = "Intervention plan not found" });
            }

            return Ok(plan);
        }

        [HttpPost("AddPlan")]
        public IActionResult AddPlan([FromBody] InterventionPlan newPlan)
        {
            _context.InterventionPlans.Add(newPlan);
            _context.SaveChanges();
            return Ok(newPlan);
        }

        [HttpPut("UpdatePlan/{planId}")]
        public IActionResult UpdatePlan(int planId, [FromBody] InterventionPlan updatedPlan)
        {
            var existing = _context.InterventionPlans.Find(planId);

            if (existing == null)
            {
                return NotFound(new { message = "Intervention plan not found" });
            }

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
            _context.SaveChanges();

            return Ok(existing);
        }
    }
}
