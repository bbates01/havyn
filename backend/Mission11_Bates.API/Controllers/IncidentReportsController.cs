using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "CaseAccess")]
    public class IncidentReportsController : ControllerBase
    {
        private HavynDbContext _context;

        public IncidentReportsController(HavynDbContext temp) => _context = temp;

        [HttpGet("AllIncidents")]
        public IActionResult GetAllIncidents(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "IncidentDate",
            string sortOrder = "desc",
            int? residentId = null,
            int? safehouseId = null,
            [FromQuery] List<string>? severities = null,
            bool? resolved = null)
        {
            var query = _context.IncidentReports.AsQueryable();

            if (residentId.HasValue)
            {
                query = query.Where(ir => ir.ResidentId == residentId.Value);
            }

            if (safehouseId.HasValue)
            {
                query = query.Where(ir => ir.SafehouseId == safehouseId.Value);
            }

            if (severities != null && severities.Any())
            {
                query = query.Where(ir => severities.Contains(ir.Severity));
            }

            if (resolved.HasValue)
            {
                query = query.Where(ir => ir.Resolved == resolved.Value);
            }

            query = sortBy switch
            {
                "IncidentDate" => sortOrder == "desc" ? query.OrderByDescending(ir => ir.IncidentDate) : query.OrderBy(ir => ir.IncidentDate),
                "Severity" => sortOrder == "desc" ? query.OrderByDescending(ir => ir.Severity) : query.OrderBy(ir => ir.Severity),
                "IncidentType" => sortOrder == "desc" ? query.OrderByDescending(ir => ir.IncidentType) : query.OrderBy(ir => ir.IncidentType),
                _ => sortOrder == "desc" ? query.OrderByDescending(ir => ir.IncidentDate) : query.OrderBy(ir => ir.IncidentDate)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetIncident/{incidentId}")]
        public IActionResult GetIncident(int incidentId)
        {
            var incident = _context.IncidentReports.Find(incidentId);

            if (incident == null)
            {
                return NotFound(new { message = "Incident report not found" });
            }

            return Ok(incident);
        }

        [HttpPost("AddIncident")]
        public IActionResult AddIncident([FromBody] IncidentReport newIncident)
        {
            _context.IncidentReports.Add(newIncident);
            _context.SaveChanges();
            return Ok(newIncident);
        }

        [HttpPut("UpdateIncident/{incidentId}")]
        public IActionResult UpdateIncident(int incidentId, [FromBody] IncidentReport updatedIncident)
        {
            var existing = _context.IncidentReports.Find(incidentId);

            if (existing == null)
            {
                return NotFound(new { message = "Incident report not found" });
            }

            existing.Resolved = updatedIncident.Resolved;
            existing.ResolutionDate = updatedIncident.ResolutionDate;
            existing.FollowUpRequired = updatedIncident.FollowUpRequired;

            _context.IncidentReports.Update(existing);
            _context.SaveChanges();

            return Ok(existing);
        }
    }
}
