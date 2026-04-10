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
    public class HealthWellbeingRecordsController : ControllerBase
    {
        private readonly HavynDbContext _context;
        private readonly IResidentAccessService _residentAccess;

        public HealthWellbeingRecordsController(HavynDbContext context, IResidentAccessService residentAccess)
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
            var query = _context.HealthWellbeingRecords.AsQueryable().Where(hr => allowedIds.Contains(hr.ResidentId));

            if (residentId.HasValue)
                query = query.Where(hr => hr.ResidentId == residentId.Value);

            query = sortBy switch
            {
                "RecordDate" => sortOrder == "desc" ? query.OrderByDescending(hr => hr.RecordDate) : query.OrderBy(hr => hr.RecordDate),
                "GeneralHealthScore" => sortOrder == "desc" ? query.OrderByDescending(hr => hr.GeneralHealthScore) : query.OrderBy(hr => hr.GeneralHealthScore),
                _ => sortOrder == "desc" ? query.OrderByDescending(hr => hr.RecordDate) : query.OrderBy(hr => hr.RecordDate)
            };

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetRecord/{healthRecordId}")]
        public async Task<IActionResult> GetRecord(int healthRecordId)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var record = await _context.HealthWellbeingRecords.FindAsync(healthRecordId);
            if (record == null)
                return NotFound(new { message = "Health wellbeing record not found" });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, record.ResidentId))
                return NotFound(new { message = "Health wellbeing record not found" });

            return Ok(record);
        }

        [HttpPost("AddRecord")]
        public async Task<IActionResult> AddRecord([FromBody] HealthWellbeingRecord newRecord)
        {
            newRecord.HealthRecordId = _context.HealthWellbeingRecords.Any()
                ? _context.HealthWellbeingRecords.Max(r => r.HealthRecordId) + 1
                : 1;
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, newRecord.ResidentId))
                return StatusCode(403, new { message = "Not authorized for this resident." });

            _context.HealthWellbeingRecords.Add(newRecord);
            await _context.SaveChangesAsync();
            return Ok(newRecord);
        }

        [HttpPut("UpdateRecord/{healthRecordId}")]
        [Authorize(Policy = "AdminOnly")]
        public IActionResult UpdateRecord(int healthRecordId, [FromBody] HealthWellbeingRecord updatedRecord)
        {
            var existing = _context.HealthWellbeingRecords.Find(healthRecordId);

            if (existing == null)
            {
                return NotFound(new { message = "Record not found" });
            }

            existing.ResidentId = updatedRecord.ResidentId;
            existing.RecordDate = updatedRecord.RecordDate;
            existing.GeneralHealthScore = updatedRecord.GeneralHealthScore;
            existing.NutritionScore = updatedRecord.NutritionScore;
            existing.SleepQualityScore = updatedRecord.SleepQualityScore;
            existing.EnergyLevelScore = updatedRecord.EnergyLevelScore;
            existing.HeightCm = updatedRecord.HeightCm;
            existing.WeightKg = updatedRecord.WeightKg;
            existing.Bmi = updatedRecord.Bmi;
            existing.MedicalCheckupDone = updatedRecord.MedicalCheckupDone;
            existing.DentalCheckupDone = updatedRecord.DentalCheckupDone;
            existing.PsychologicalCheckupDone = updatedRecord.PsychologicalCheckupDone;
            existing.Notes = updatedRecord.Notes;

            _context.HealthWellbeingRecords.Update(existing);
            _context.SaveChanges();
            return Ok(existing);
        }

        [HttpDelete("DeleteRecord/{healthRecordId}")]
        [Authorize(Policy = "AdminOnly")]
        public IActionResult DeleteRecord(int healthRecordId)
        {
            var existing = _context.HealthWellbeingRecords.Find(healthRecordId);
            if (existing == null)
                return NotFound(new { message = "Record not found" });

            _context.HealthWellbeingRecords.Remove(existing);
            _context.SaveChanges();
            return NoContent();
        }
    }
}
