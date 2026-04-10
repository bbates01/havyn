using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
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
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IResidentAccessService _residentAccess;

        public ProcessRecordingsController(
            HavynDbContext context,
            UserManager<ApplicationUser> userManager,
            IResidentAccessService residentAccess)
        {
            _context = context;
            _userManager = userManager;
            _residentAccess = residentAccess;
        }

        private static bool IsSocialWorkerOnly(IList<string> roles) =>
            roles.Contains("SocialWorker") && !roles.Contains("Admin") && !roles.Contains("Manager");

        private static ProcessRecording CloneForWorkerResponse(ProcessRecording r) =>
            new()
            {
                RecordingId = r.RecordingId,
                ResidentId = r.ResidentId,
                SessionDate = r.SessionDate,
                SocialWorker = r.SocialWorker,
                SessionType = r.SessionType,
                SessionDurationMinutes = r.SessionDurationMinutes,
                EmotionalStateObserved = r.EmotionalStateObserved,
                EmotionalStateEnd = r.EmotionalStateEnd,
                SessionNarrative = r.SessionNarrative,
                InterventionsApplied = r.InterventionsApplied,
                FollowUpActions = r.FollowUpActions,
                ProgressNoted = r.ProgressNoted,
                ConcernsFlagged = r.ConcernsFlagged,
                ReferralMade = r.ReferralMade,
                NotesRestricted = null
            };

        private async Task<IList<string>> GetCallerRolesAsync()
        {
            var caller = await _userManager.GetUserAsync(User);
            if (caller == null) return Array.Empty<string>();
            return await _userManager.GetRolesAsync(caller);
        }

        private async Task<ApplicationUser?> GetCallerAsync() =>
            await _userManager.GetUserAsync(User);

        [HttpGet("AllRecordings")]
        public async Task<IActionResult> GetAllRecordings(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "SessionDate",
            string sortOrder = "desc",
            int? residentId = null,
            string? socialWorker = null)
        {
            var roles = await GetCallerRolesAsync();
            var stripNotes = IsSocialWorkerOnly(roles);

            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var allowedIds = _residentAccess.ResidentIdsInScope(_context, scope);
            var query = _context.ProcessRecordings
                .AsQueryable()
                .Where(pr => allowedIds.Contains(pr.ResidentId));

            if (residentId.HasValue)
                query = query.Where(pr => pr.ResidentId == residentId.Value);

            if (!string.IsNullOrEmpty(socialWorker))
                query = query.Where(pr => pr.SocialWorker == socialWorker);

            query = sortBy switch
            {
                "SessionDate" => sortOrder == "desc"
                    ? query.OrderByDescending(pr => pr.SessionDate)
                    : query.OrderBy(pr => pr.SessionDate),
                "SessionType" => sortOrder == "desc"
                    ? query.OrderByDescending(pr => pr.SessionType)
                    : query.OrderBy(pr => pr.SessionType),
                _ => sortOrder == "desc"
                    ? query.OrderByDescending(pr => pr.SessionDate)
                    : query.OrderBy(pr => pr.SessionDate)
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            if (stripNotes)
                items = items.Select(CloneForWorkerResponse).ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetRecording/{recordingId}")]
        public async Task<IActionResult> GetRecording(int recordingId)
        {
            var roles = await GetCallerRolesAsync();
            var stripNotes = IsSocialWorkerOnly(roles);

            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var recording = await _context.ProcessRecordings.FindAsync(recordingId);
            if (recording == null)
                return NotFound(new { message = "Process recording not found" });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, recording.ResidentId))
                return NotFound(new { message = "Process recording not found" });

            return Ok(stripNotes ? CloneForWorkerResponse(recording) : recording);
        }

        [HttpPost("AddRecording")]
        public async Task<IActionResult> AddRecording([FromBody] ProcessRecording newRecording, int? appointmentId = null)
        {
            var caller = await GetCallerAsync();
            if (caller == null) return Unauthorized();

            var roles = await _userManager.GetRolesAsync(caller);

            var resident = await _context.Residents.FindAsync(newRecording.ResidentId);
            if (resident == null)
                return BadRequest(new { message = "Resident not found." });

            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, newRecording.ResidentId))
                return StatusCode(403, new { message = "Not authorized for this resident." });

            if (roles.Contains("Manager") && !roles.Contains("Admin"))
            {
                if (caller.SafehouseId == null)
                    return StatusCode(403, new { message = "Your account is not assigned to a safehouse." });

                if (resident.SafehouseId != caller.SafehouseId.Value)
                    return StatusCode(403, new { message = "You can only add recordings for residents in your safehouse." });
            }

            if (IsSocialWorkerOnly(roles))
                newRecording.NotesRestricted = null;

            _context.ProcessRecordings.Add(newRecording);
            await _context.SaveChangesAsync();

            if (appointmentId.HasValue)
            {
                var appointment = await _context.Appointments.FindAsync(appointmentId.Value);
                if (appointment != null &&
                    appointment.Status == "Scheduled" &&
                    await _residentAccess.CanAccessResidentAsync(_context, scope, appointment.ResidentId))
                {
                    appointment.Status = "Completed";
                    _context.Appointments.Update(appointment);
                    await _context.SaveChangesAsync();
                }
            }

            var response = IsSocialWorkerOnly(roles)
                ? CloneForWorkerResponse(newRecording)
                : newRecording;

            return Ok(response);
        }

        [HttpPut("UpdateRecording/{recordingId}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> UpdateRecording(int recordingId, [FromBody] ProcessRecording body)
        {
            var caller = await GetCallerAsync();
            if (caller == null) return Unauthorized();

            var roles = await _userManager.GetRolesAsync(caller);

            var existing = await _context.ProcessRecordings.FindAsync(recordingId);
            if (existing == null)
                return NotFound(new { message = "Process recording not found" });

            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, existing.ResidentId))
                return StatusCode(403, new { message = "Not authorized to update this recording." });

            var residentForExisting = await _context.Residents.FindAsync(existing.ResidentId);
            if (residentForExisting == null)
                return BadRequest(new { message = "Linked resident not found." });

            var residentForNew = await _context.Residents.FindAsync(body.ResidentId);
            if (residentForNew == null)
                return BadRequest(new { message = "Resident not found." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, body.ResidentId))
                return StatusCode(403, new { message = "Not authorized for the target resident." });

            if (roles.Contains("Manager") && !roles.Contains("Admin"))
            {
                if (caller.SafehouseId == null)
                    return StatusCode(403, new { message = "Your account is not assigned to a safehouse." });

                if (residentForExisting.SafehouseId != caller.SafehouseId.Value)
                    return StatusCode(403, new { message = "You cannot update this recording." });

                if (residentForNew.SafehouseId != caller.SafehouseId.Value)
                    return StatusCode(403, new { message = "You can only assign recordings to residents in your safehouse." });
            }

            existing.ResidentId = body.ResidentId;
            existing.SessionDate = body.SessionDate;
            existing.SocialWorker = body.SocialWorker;
            existing.SessionType = body.SessionType;
            existing.SessionDurationMinutes = body.SessionDurationMinutes;
            existing.EmotionalStateObserved = body.EmotionalStateObserved;
            existing.EmotionalStateEnd = body.EmotionalStateEnd;
            existing.SessionNarrative = body.SessionNarrative;
            existing.InterventionsApplied = body.InterventionsApplied;
            existing.FollowUpActions = body.FollowUpActions;
            existing.ProgressNoted = body.ProgressNoted;
            existing.ConcernsFlagged = body.ConcernsFlagged;
            existing.ReferralMade = body.ReferralMade;

            if (IsSocialWorkerOnly(roles))
            {
                // Preserve restricted notes; ignore body.NotesRestricted
            }
            else
            {
                existing.NotesRestricted = body.NotesRestricted;
            }

            await _context.SaveChangesAsync();

            var response = IsSocialWorkerOnly(roles)
                ? CloneForWorkerResponse(existing)
                : existing;

            return Ok(response);
        }

        [HttpDelete("DeleteRecording/{recordingId}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> DeleteRecording(int recordingId)
        {
            var existing = await _context.ProcessRecordings.FindAsync(recordingId);
            if (existing == null)
                return NotFound(new { message = "Process recording not found" });

            _context.ProcessRecordings.Remove(existing);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
