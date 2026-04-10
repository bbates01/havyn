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
    public class ProcessRecordingsController : ControllerBase
    {
        private readonly HavynDbContext _context;
        private readonly IResidentAccessService _residentAccess;

        public ProcessRecordingsController(HavynDbContext context, IResidentAccessService residentAccess)
        {
            _context = context;
            _residentAccess = residentAccess;
        }

        [HttpGet("AllRecordings")]
        public async Task<IActionResult> GetAllRecordings(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "SessionDate",
            string sortOrder = "desc",
            int? residentId = null,
            string? socialWorker = null)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var allowedIds = _residentAccess.ResidentIdsInScope(_context, scope);
            var query = _context.ProcessRecordings.AsQueryable().Where(pr => allowedIds.Contains(pr.ResidentId));

            if (residentId.HasValue)
                query = query.Where(pr => pr.ResidentId == residentId.Value);

            if (!string.IsNullOrEmpty(socialWorker))
                query = query.Where(pr => pr.SocialWorker == socialWorker);

            query = sortBy switch
            {
                "SessionDate" => sortOrder == "desc" ? query.OrderByDescending(pr => pr.SessionDate) : query.OrderBy(pr => pr.SessionDate),
                "SessionType" => sortOrder == "desc" ? query.OrderByDescending(pr => pr.SessionType) : query.OrderBy(pr => pr.SessionType),
                _ => sortOrder == "desc" ? query.OrderByDescending(pr => pr.SessionDate) : query.OrderBy(pr => pr.SessionDate)
            };

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetRecording/{recordingId}")]
        public async Task<IActionResult> GetRecording(int recordingId)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var recording = await _context.ProcessRecordings.FindAsync(recordingId);
            if (recording == null)
                return NotFound(new { message = "Process recording not found" });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, recording.ResidentId))
                return NotFound(new { message = "Process recording not found" });

            return Ok(recording);
        }

        [HttpPost("AddRecording")]
        public async Task<IActionResult> AddRecording([FromBody] ProcessRecording newRecording, int? appointmentId = null)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, newRecording.ResidentId))
                return StatusCode(403, new { message = "Not authorized for this resident." });

            _context.ProcessRecordings.Add(newRecording);
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

            return Ok(newRecording);
        }
    }
}
