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
    public class HomeVisitationsController : ControllerBase
    {
        private readonly HavynDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IResidentAccessService _residentAccess;

        public HomeVisitationsController(
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

        private async Task<ApplicationUser?> GetCallerAsync() =>
            await _userManager.GetUserAsync(User);

        private async Task<IList<string>> GetCallerRolesAsync()
        {
            var caller = await _userManager.GetUserAsync(User);
            if (caller == null) return Array.Empty<string>();
            return await _userManager.GetRolesAsync(caller);
        }

        /// <summary>
        /// Returns null if access is allowed; otherwise an IActionResult error (403/400).
        /// </summary>
        private IActionResult? TryAuthorizeResidentForHomeVisitation(
            ApplicationUser caller,
            IList<string> roles,
            Resident? resident)
        {
            if (resident == null)
                return BadRequest(new { message = "Resident not found." });

            if (roles.Contains("Admin"))
                return null;

            if (roles.Contains("Manager"))
            {
                if (caller.SafehouseId == null)
                    return StatusCode(403, new { message = "Your account is not assigned to a safehouse." });

                if (resident.SafehouseId != caller.SafehouseId.Value)
                    return StatusCode(403, new { message = "You do not have access to this resident." });

                return null;
            }

            if (roles.Contains("SocialWorker"))
            {
                if (string.IsNullOrEmpty(caller.SocialWorkerCode))
                    return StatusCode(403, new { message = "Your account has no social worker code." });

                if (resident.AssignedSocialWorker != caller.SocialWorkerCode)
                    return StatusCode(403, new { message = "You can only file visitations for residents assigned to you." });

                return null;
            }

            return StatusCode(403, new { message = "Access denied." });
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
            var caller = await GetCallerAsync();
            if (caller == null) return Unauthorized();

            var roles = await _userManager.GetRolesAsync(caller);

            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var allowedIds = _residentAccess.ResidentIdsInScope(_context, scope);
            var query = _context.HomeVisitations
                .AsQueryable()
                .Where(hv => allowedIds.Contains(hv.ResidentId));

            if (!roles.Contains("Admin"))
            {
                if (roles.Contains("Manager"))
                {
                    if (caller.SafehouseId == null)
                        return StatusCode(403, new { message = "Your account is not assigned to a safehouse." });

                    var shId = caller.SafehouseId.Value;
                    query = query.Where(hv =>
                        _context.Residents.Any(r =>
                            r.ResidentId == hv.ResidentId && r.SafehouseId == shId));
                }
                else if (IsSocialWorkerOnly(roles))
                {
                    var code = caller.SocialWorkerCode;
                    if (string.IsNullOrEmpty(code))
                        return Ok(new { Items = Array.Empty<HomeVisitation>(), TotalCount = 0 });

                    query = query.Where(hv =>
                        _context.Residents.Any(r =>
                            r.ResidentId == hv.ResidentId && r.AssignedSocialWorker == code));
                }
            }

            if (residentId.HasValue)
                query = query.Where(hv => hv.ResidentId == residentId.Value);

            if (!string.IsNullOrEmpty(socialWorker))
                query = query.Where(hv => hv.SocialWorker == socialWorker);

            query = sortBy switch
            {
                "VisitDate" => sortOrder == "desc"
                    ? query.OrderByDescending(hv => hv.VisitDate)
                    : query.OrderBy(hv => hv.VisitDate),

                "VisitType" => sortOrder == "desc"
                    ? query.OrderByDescending(hv => hv.VisitType)
                    : query.OrderBy(hv => hv.VisitType),

                _ => sortOrder == "desc"
                    ? query.OrderByDescending(hv => hv.VisitDate)
                    : query.OrderBy(hv => hv.VisitDate)
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
            var caller = await GetCallerAsync();
            if (caller == null) return Unauthorized();

            var roles = await _userManager.GetRolesAsync(caller);

            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var visitation = await _context.HomeVisitations.FindAsync(visitationId);
            if (visitation == null)
                return NotFound(new { message = "Home visitation not found" });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, visitation.ResidentId))
                return NotFound(new { message = "Home visitation not found" });

            var resident = await _context.Residents.FindAsync(visitation.ResidentId);
            var auth = TryAuthorizeResidentForHomeVisitation(caller, roles, resident);
            if (auth != null) return auth;

            return Ok(visitation);
        }

        [HttpPost("AddVisitation")]
        public async Task<IActionResult> AddVisitation([FromBody] HomeVisitation newVisitation, int? appointmentId = null)
        {
            var caller = await GetCallerAsync();
            if (caller == null) return Unauthorized();

            var roles = await _userManager.GetRolesAsync(caller);

            var resident = await _context.Residents.FindAsync(newVisitation.ResidentId);
            var auth = TryAuthorizeResidentForHomeVisitation(caller, roles, resident);
            if (auth != null) return auth;

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
                if (appointment != null &&
                    appointment.Status == "Scheduled" &&
                    await _residentAccess.CanAccessResidentAsync(_context, scope, appointment.ResidentId))
                {
                    appointment.Status = "Completed";
                    _context.Appointments.Update(appointment);
                    await _context.SaveChangesAsync();
                }
            }

            return Ok(newVisitation);
        }

        [HttpPut("UpdateVisitation/{visitationId}")]
        public async Task<IActionResult> UpdateVisitation(int visitationId, [FromBody] HomeVisitation body)
        {
            var caller = await GetCallerAsync();
            if (caller == null) return Unauthorized();

            var roles = await _userManager.GetRolesAsync(caller);

            var existing = await _context.HomeVisitations.FindAsync(visitationId);
            if (existing == null)
                return NotFound(new { message = "Home visitation not found" });

            var residentForExisting = await _context.Residents.FindAsync(existing.ResidentId);
            var authExisting = TryAuthorizeResidentForHomeVisitation(caller, roles, residentForExisting);
            if (authExisting != null) return authExisting;

            var residentForNew = await _context.Residents.FindAsync(body.ResidentId);
            var authNew = TryAuthorizeResidentForHomeVisitation(caller, roles, residentForNew);
            if (authNew != null) return authNew;

            existing.ResidentId = body.ResidentId;
            existing.VisitDate = body.VisitDate;
            existing.SocialWorker = body.SocialWorker;
            existing.VisitType = body.VisitType;
            existing.LocationVisited = body.LocationVisited;
            existing.FamilyMembersPresent = body.FamilyMembersPresent;
            existing.Purpose = body.Purpose;
            existing.Observations = body.Observations;
            existing.FamilyCooperationLevel = body.FamilyCooperationLevel;
            existing.SafetyConcernsNoted = body.SafetyConcernsNoted;
            existing.FollowUpNeeded = body.FollowUpNeeded;
            existing.FollowUpNotes = body.FollowUpNotes;
            existing.VisitOutcome = body.VisitOutcome;

            await _context.SaveChangesAsync();

            return Ok(existing);
        }
    }
}