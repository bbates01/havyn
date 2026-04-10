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
    public class IncidentReportsController : ControllerBase
    {
        private readonly HavynDbContext _context;
        private readonly IResidentAccessService _residentAccess;

        public IncidentReportsController(HavynDbContext context, IResidentAccessService residentAccess)
        {
            _context = context;
            _residentAccess = residentAccess;
        }

        [HttpGet("AllIncidents")]
        public async Task<IActionResult> GetAllIncidents(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "IncidentDate",
            string sortOrder = "desc",
            int? residentId = null,
            int? safehouseId = null,
            [FromQuery] List<string>? severities = null,
            bool? resolved = null)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var allowedIds = _residentAccess.ResidentIdsInScope(_context, scope);
            var query = _context.IncidentReports.AsQueryable().Where(ir => allowedIds.Contains(ir.ResidentId));

            if (residentId.HasValue)
                query = query.Where(ir => ir.ResidentId == residentId.Value);

            if (safehouseId.HasValue)
                query = query.Where(ir => ir.SafehouseId == safehouseId.Value);

            if (severities != null && severities.Any())
                query = query.Where(ir => severities.Contains(ir.Severity));

            if (resolved.HasValue)
                query = query.Where(ir => ir.Resolved == resolved.Value);

            query = sortBy switch
            {
                "IncidentDate" => sortOrder == "desc" ? query.OrderByDescending(ir => ir.IncidentDate) : query.OrderBy(ir => ir.IncidentDate),
                "Severity" => sortOrder == "desc" ? query.OrderByDescending(ir => ir.Severity) : query.OrderBy(ir => ir.Severity),
                "IncidentType" => sortOrder == "desc" ? query.OrderByDescending(ir => ir.IncidentType) : query.OrderBy(ir => ir.IncidentType),
                _ => sortOrder == "desc" ? query.OrderByDescending(ir => ir.IncidentDate) : query.OrderBy(ir => ir.IncidentDate)
            };

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetIncident/{incidentId}")]
        public async Task<IActionResult> GetIncident(int incidentId)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var incident = await _context.IncidentReports.FindAsync(incidentId);
            if (incident == null)
                return NotFound(new { message = "Incident report not found" });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, incident.ResidentId))
                return NotFound(new { message = "Incident report not found" });

            return Ok(incident);
        }

        [HttpPost("AddIncident")]
        public async Task<IActionResult> AddIncident([FromBody] IncidentReport newIncident)
        {
            newIncident.IncidentId = _context.IncidentReports.Any()
                ? _context.IncidentReports.Max(i => i.IncidentId) + 1
                : 1;
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, newIncident.ResidentId))
                return StatusCode(403, new { message = "Not authorized for this resident." });

            var resident = await _context.Residents.FindAsync(newIncident.ResidentId);
            if (resident == null)
                return BadRequest(new { message = "Resident not found." });
            if (newIncident.SafehouseId != resident.SafehouseId)
                return BadRequest(new { message = "Incident safehouse must match the resident's safehouse." });

            _context.IncidentReports.Add(newIncident);
            await _context.SaveChangesAsync();
            return Ok(newIncident);
        }

        [HttpPut("UpdateIncident/{incidentId}")]
        public async Task<IActionResult> UpdateIncident(int incidentId, [FromBody] IncidentReport updatedIncident)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var existing = await _context.IncidentReports.FindAsync(incidentId);
            if (existing == null)
                return NotFound(new { message = "Incident report not found" });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, existing.ResidentId))
                return NotFound(new { message = "Incident report not found" });

            existing.ResidentId = updatedIncident.ResidentId;
            existing.SafehouseId = updatedIncident.SafehouseId;
            existing.IncidentDate = updatedIncident.IncidentDate;
            existing.ReportedBy = updatedIncident.ReportedBy;
            existing.IncidentType = updatedIncident.IncidentType;
            existing.Severity = updatedIncident.Severity;
            existing.Description = updatedIncident.Description;
            existing.ResponseTaken = updatedIncident.ResponseTaken;
            existing.Resolved = updatedIncident.Resolved;
            existing.ResolutionDate = updatedIncident.ResolutionDate;
            existing.FollowUpRequired = updatedIncident.FollowUpRequired;

            _context.IncidentReports.Update(existing);
            await _context.SaveChangesAsync();

            return Ok(existing);
        }
    }
}
