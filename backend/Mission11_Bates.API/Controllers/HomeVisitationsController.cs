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
    public class HomeVisitationsController : ControllerBase
    {
        private readonly HavynDbContext _context;
        private readonly IResidentAccessService _residentAccess;

        public HomeVisitationsController(HavynDbContext context, IResidentAccessService residentAccess)
        {
            _context = context;
            _residentAccess = residentAccess;
        }

        [HttpGet("AllVisitations")]
        public async Task<IActionResult> GetAllVisitations(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "VisitDate",
            string sortOrder = "desc",
            int? residentId = null,
            string? socialWorker = null)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var allowedIds = _residentAccess.ResidentIdsInScope(_context, scope);
            var query = _context.HomeVisitations.AsQueryable().Where(hv => allowedIds.Contains(hv.ResidentId));

            if (residentId.HasValue)
                query = query.Where(hv => hv.ResidentId == residentId.Value);

            if (!string.IsNullOrEmpty(socialWorker))
                query = query.Where(hv => hv.SocialWorker == socialWorker);

            query = sortBy switch
            {
                "VisitDate" => sortOrder == "desc" ? query.OrderByDescending(hv => hv.VisitDate) : query.OrderBy(hv => hv.VisitDate),
                "VisitType" => sortOrder == "desc" ? query.OrderByDescending(hv => hv.VisitType) : query.OrderBy(hv => hv.VisitType),
                _ => sortOrder == "desc" ? query.OrderByDescending(hv => hv.VisitDate) : query.OrderBy(hv => hv.VisitDate)
            };

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetVisitation/{visitationId}")]
        public async Task<IActionResult> GetVisitation(int visitationId)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var visitation = await _context.HomeVisitations.FindAsync(visitationId);
            if (visitation == null)
                return NotFound(new { message = "Home visitation not found" });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, visitation.ResidentId))
                return NotFound(new { message = "Home visitation not found" });

            return Ok(visitation);
        }

        [HttpPost("AddVisitation")]
        public async Task<IActionResult> AddVisitation([FromBody] HomeVisitation newVisitation, int? appointmentId = null)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, newVisitation.ResidentId))
                return StatusCode(403, new { message = "Not authorized for this resident." });

            _context.HomeVisitations.Add(newVisitation);
            await _context.SaveChangesAsync();

            if (appointmentId.HasValue)
            {
                var appointment = await _context.Appointments.FindAsync(appointmentId.Value);
                if (appointment != null && appointment.Status == "Scheduled" &&
                    await _residentAccess.CanAccessResidentAsync(_context, scope, appointment.ResidentId))
                {
                    appointment.Status = "Completed";
                    _context.Appointments.Update(appointment);
                    await _context.SaveChangesAsync();
                }
            }

            return Ok(newVisitation);
        }
    }
}
