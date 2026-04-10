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
    public class EducationRecordsController : ControllerBase
    {
        private readonly HavynDbContext _context;
        private readonly IResidentAccessService _residentAccess;

        public EducationRecordsController(HavynDbContext context, IResidentAccessService residentAccess)
        {
            _context = context;
            _residentAccess = residentAccess;
        }

        [HttpGet("AllRecords")]
        public async Task<IActionResult> GetAllRecords(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "RecordDate",
            string sortOrder = "desc",
            int? residentId = null)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var allowedIds = _residentAccess.ResidentIdsInScope(_context, scope);
            var query = _context.EducationRecords.AsQueryable().Where(er => allowedIds.Contains(er.ResidentId));

            if (residentId.HasValue)
                query = query.Where(er => er.ResidentId == residentId.Value);

            query = sortBy switch
            {
                "RecordDate" => sortOrder == "desc" ? query.OrderByDescending(er => er.RecordDate) : query.OrderBy(er => er.RecordDate),
                "EducationLevel" => sortOrder == "desc" ? query.OrderByDescending(er => er.EducationLevel) : query.OrderBy(er => er.EducationLevel),
                "ProgressPercent" => sortOrder == "desc" ? query.OrderByDescending(er => er.ProgressPercent) : query.OrderBy(er => er.ProgressPercent),
                _ => sortOrder == "desc" ? query.OrderByDescending(er => er.RecordDate) : query.OrderBy(er => er.RecordDate)
            };

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetRecord/{educationRecordId}")]
        public async Task<IActionResult> GetRecord(int educationRecordId)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var record = await _context.EducationRecords.FindAsync(educationRecordId);
            if (record == null)
                return NotFound(new { message = "Education record not found" });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, record.ResidentId))
                return NotFound(new { message = "Education record not found" });

            return Ok(record);
        }

        [HttpPost("AddRecord")]
        public async Task<IActionResult> AddRecord([FromBody] EducationRecord newRecord)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, newRecord.ResidentId))
                return StatusCode(403, new { message = "Not authorized for this resident." });

            _context.EducationRecords.Add(newRecord);
            await _context.SaveChangesAsync();
            return Ok(newRecord);
        }
    }
}
