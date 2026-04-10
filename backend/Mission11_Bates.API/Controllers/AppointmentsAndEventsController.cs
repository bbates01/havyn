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
    public class AppointmentsAndEventsController : ControllerBase
    {
        private readonly HavynDbContext _context;
        private readonly IResidentAccessService _residentAccess;
        private readonly UserManager<ApplicationUser> _userManager;

        public AppointmentsAndEventsController(
            HavynDbContext context,
            IResidentAccessService residentAccess,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _residentAccess = residentAccess;
            _userManager = userManager;
        }

        // ── Appointments (staff sessions linked to residents) ──

        [HttpGet("AllAppointments")]
        [Authorize(Policy = "CaseAccess")]
        public async Task<IActionResult> GetAllAppointments(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "AppointmentDate",
            string sortOrder = "desc",
            string? staffUserId = null,
            int? residentId = null,
            [FromQuery] List<string>? statuses = null)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var allowedIds = _residentAccess.ResidentIdsInScope(_context, scope);
            var query = _context.Appointments.AsQueryable().Where(a => allowedIds.Contains(a.ResidentId));

            if (!string.IsNullOrEmpty(staffUserId))
                query = query.Where(a => a.StaffUserId == staffUserId);

            if (residentId.HasValue)
                query = query.Where(a => a.ResidentId == residentId.Value);

            if (statuses != null && statuses.Any())
                query = query.Where(a => statuses.Contains(a.Status));

            query = sortBy switch
            {
                "AppointmentDate" => sortOrder == "desc" ? query.OrderByDescending(a => a.AppointmentDate) : query.OrderBy(a => a.AppointmentDate),
                "AppointmentType" => sortOrder == "desc" ? query.OrderByDescending(a => a.AppointmentType) : query.OrderBy(a => a.AppointmentType),
                "Status" => sortOrder == "desc" ? query.OrderByDescending(a => a.Status) : query.OrderBy(a => a.Status),
                _ => sortOrder == "desc" ? query.OrderByDescending(a => a.AppointmentDate) : query.OrderBy(a => a.AppointmentDate)
            };

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetAppointment/{appointmentId}")]
        [Authorize(Policy = "CaseAccess")]
        public async Task<IActionResult> GetAppointment(int appointmentId)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var appointment = await _context.Appointments.FindAsync(appointmentId);
            if (appointment == null)
                return NotFound(new { message = "Appointment not found" });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, appointment.ResidentId))
                return NotFound(new { message = "Appointment not found" });

            return Ok(appointment);
        }

        [HttpPost("AddAppointment")]
        [Authorize(Policy = "CaseAccess")]
        public async Task<IActionResult> AddAppointment([FromBody] Appointment newAppointment)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, newAppointment.ResidentId))
                return StatusCode(403, new { message = "Not authorized for this resident." });

            _context.Appointments.Add(newAppointment);
            await _context.SaveChangesAsync();
            return Ok(newAppointment);
        }

        [HttpPut("UpdateAppointment/{appointmentId}")]
        [Authorize(Policy = "CaseAccess")]
        public async Task<IActionResult> UpdateAppointment(int appointmentId, [FromBody] Appointment updatedAppointment)
        {
            var scope = await _residentAccess.GetScopeAsync(User);
            if (!_residentAccess.ScopeAllowsCaseAccess(scope))
                return StatusCode(403, new { message = "Account is not configured for case access." });

            var existing = await _context.Appointments.FindAsync(appointmentId);
            if (existing == null)
                return NotFound(new { message = "Appointment not found" });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, existing.ResidentId))
                return NotFound(new { message = "Appointment not found" });

            if (updatedAppointment.ResidentId != existing.ResidentId && scope.Kind != ResidentScopeKind.Unrestricted)
                return BadRequest(new { message = "Cannot move an appointment to another resident." });

            if (!await _residentAccess.CanAccessResidentAsync(_context, scope, updatedAppointment.ResidentId))
                return StatusCode(403, new { message = "Not authorized for this resident." });

            existing.StaffUserId = updatedAppointment.StaffUserId;
            existing.ResidentId = updatedAppointment.ResidentId;
            existing.AppointmentDate = updatedAppointment.AppointmentDate;
            existing.AppointmentTime = updatedAppointment.AppointmentTime;
            existing.AppointmentType = updatedAppointment.AppointmentType;
            existing.SessionFormat = updatedAppointment.SessionFormat;
            existing.Location = updatedAppointment.Location;
            existing.Notes = updatedAppointment.Notes;
            existing.Status = updatedAppointment.Status;
            existing.UpdatedAt = updatedAppointment.UpdatedAt;

            _context.Appointments.Update(existing);
            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        // ── Events (calendar; staff read; Admin/Manager write) ──

        [HttpGet("AllEvents")]
        [Authorize(Policy = "InternalStaff")]
        public async Task<IActionResult> GetAllEvents(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "EventDate",
            string sortOrder = "desc",
            int? safehouseId = null,
            [FromQuery] List<string>? eventTypes = null,
            [FromQuery] List<string>? statuses = null)
        {
            var query = await FilterEventsQueryAsync();
            if (query == null)
                return StatusCode(403, new { message = "Not authorized." });

            if (safehouseId.HasValue)
                query = query.Where(e => e.SafehouseId == safehouseId.Value || e.SafehouseId == null);

            if (eventTypes != null && eventTypes.Any())
                query = query.Where(e => eventTypes.Contains(e.EventType));

            if (statuses != null && statuses.Any())
                query = query.Where(e => statuses.Contains(e.Status));

            query = sortBy switch
            {
                "EventDate" => sortOrder == "desc" ? query.OrderByDescending(e => e.EventDate) : query.OrderBy(e => e.EventDate),
                "EventType" => sortOrder == "desc" ? query.OrderByDescending(e => e.EventType) : query.OrderBy(e => e.EventType),
                "Title" => sortOrder == "desc" ? query.OrderByDescending(e => e.Title) : query.OrderBy(e => e.Title),
                "Status" => sortOrder == "desc" ? query.OrderByDescending(e => e.Status) : query.OrderBy(e => e.Status),
                _ => sortOrder == "desc" ? query.OrderByDescending(e => e.EventDate) : query.OrderBy(e => e.EventDate)
            };

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetEvent/{eventId}")]
        [Authorize(Policy = "InternalStaff")]
        public async Task<IActionResult> GetEvent(int eventId)
        {
            var ev = await _context.Events.FindAsync(eventId);
            if (ev == null)
                return NotFound(new { message = "Event not found" });

            if (!await CanAccessEventAsync(ev))
                return NotFound(new { message = "Event not found" });

            return Ok(ev);
        }

        [HttpPost("AddEvent")]
        [Authorize(Policy = "StaffManagement")]
        public async Task<IActionResult> AddEvent([FromBody] Event newEvent)
        {
            var caller = await _userManager.GetUserAsync(User);
            if (caller == null)
                return Unauthorized();

            var roles = await _userManager.GetRolesAsync(caller);
            var callerIsAdmin = roles.Contains("Admin");
            var callerIsManager = roles.Contains("Manager");

            if (!callerIsAdmin && callerIsManager)
            {
                if (newEvent.SafehouseId.HasValue && newEvent.SafehouseId != caller.SafehouseId)
                    return StatusCode(403, new { message = "Managers can only create events for their safehouse." });
                if (!newEvent.SafehouseId.HasValue && caller.SafehouseId.HasValue)
                    newEvent.SafehouseId = caller.SafehouseId;
            }

            _context.Events.Add(newEvent);
            await _context.SaveChangesAsync();
            return Ok(newEvent);
        }

        [HttpPut("UpdateEvent/{eventId}")]
        [Authorize(Policy = "StaffManagement")]
        public async Task<IActionResult> UpdateEvent(int eventId, [FromBody] Event updatedEvent)
        {
            var caller = await _userManager.GetUserAsync(User);
            if (caller == null)
                return Unauthorized();

            var roles = await _userManager.GetRolesAsync(caller);
            var callerIsAdmin = roles.Contains("Admin");
            var callerIsManager = roles.Contains("Manager");

            var existing = await _context.Events.FindAsync(eventId);
            if (existing == null)
                return NotFound(new { message = "Event not found" });

            if (!await CanAccessEventAsync(existing))
                return NotFound(new { message = "Event not found" });

            if (!callerIsAdmin && callerIsManager)
            {
                if (updatedEvent.SafehouseId.HasValue && updatedEvent.SafehouseId != caller.SafehouseId)
                    return StatusCode(403, new { message = "Managers can only assign events to their safehouse." });
            }

            existing.EventType = updatedEvent.EventType;
            existing.Title = updatedEvent.Title;
            existing.Description = updatedEvent.Description;
            existing.EventDate = updatedEvent.EventDate;
            existing.EventTime = updatedEvent.EventTime;
            existing.SafehouseId = updatedEvent.SafehouseId;
            existing.Status = updatedEvent.Status;
            existing.UpdatedAt = updatedEvent.UpdatedAt;

            _context.Events.Update(existing);
            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        private async Task<IQueryable<Event>?> FilterEventsQueryAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return null;

            var roles = await _userManager.GetRolesAsync(user);
            var q = _context.Events.AsQueryable();

            if (roles.Contains("Admin"))
                return q;

            if (roles.Contains("Manager") && user.SafehouseId.HasValue)
                return q.Where(e => e.SafehouseId == null || e.SafehouseId == user.SafehouseId);

            if (roles.Contains("SocialWorker") && !string.IsNullOrWhiteSpace(user.SocialWorkerCode))
            {
                var code = user.SocialWorkerCode.Trim();
                var shIds = _context.Residents
                    .Where(r => r.AssignedSocialWorker == code)
                    .Select(r => r.SafehouseId)
                    .Distinct();
                return q.Where(e => e.SafehouseId == null || (e.SafehouseId != null && shIds.Contains(e.SafehouseId.Value)));
            }

            return q.Where(e => e.SafehouseId == null);
        }

        private async Task<bool> CanAccessEventAsync(Event ev)
        {
            var filtered = await FilterEventsQueryAsync();
            if (filtered == null)
                return false;
            return await filtered.AnyAsync(e => e.EventId == ev.EventId);
        }
    }
}
