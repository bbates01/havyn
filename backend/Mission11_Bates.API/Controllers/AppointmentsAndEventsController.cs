using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AppointmentsAndEventsController : ControllerBase
    {
        private HavynDbContext _context;

        public AppointmentsAndEventsController(HavynDbContext temp) => _context = temp;

        // ── Appointments (staff sessions linked to residents) ──

        [HttpGet("AllAppointments")]
        public IActionResult GetAllAppointments(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "AppointmentDate",
            string sortOrder = "desc",
            string? staffUserId = null,
            int? residentId = null,
            [FromQuery] List<string>? statuses = null)
        {
            var query = _context.Appointments.AsQueryable();

            if (!string.IsNullOrEmpty(staffUserId))
            {
                query = query.Where(a => a.StaffUserId == staffUserId);
            }

            if (residentId.HasValue)
            {
                query = query.Where(a => a.ResidentId == residentId.Value);
            }

            if (statuses != null && statuses.Any())
            {
                query = query.Where(a => statuses.Contains(a.Status));
            }

            query = sortBy switch
            {
                "AppointmentDate" => sortOrder == "desc" ? query.OrderByDescending(a => a.AppointmentDate) : query.OrderBy(a => a.AppointmentDate),
                "AppointmentType" => sortOrder == "desc" ? query.OrderByDescending(a => a.AppointmentType) : query.OrderBy(a => a.AppointmentType),
                "Status" => sortOrder == "desc" ? query.OrderByDescending(a => a.Status) : query.OrderBy(a => a.Status),
                _ => sortOrder == "desc" ? query.OrderByDescending(a => a.AppointmentDate) : query.OrderBy(a => a.AppointmentDate)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetAppointment/{appointmentId}")]
        public IActionResult GetAppointment(int appointmentId)
        {
            var appointment = _context.Appointments.Find(appointmentId);

            if (appointment == null)
            {
                return NotFound(new { message = "Appointment not found" });
            }

            return Ok(appointment);
        }

        [HttpPost("AddAppointment")]
        public IActionResult AddAppointment([FromBody] Appointment newAppointment)
        {
            _context.Appointments.Add(newAppointment);
            _context.SaveChanges();
            return Ok(newAppointment);
        }

        [HttpPut("UpdateAppointment/{appointmentId}")]
        public IActionResult UpdateAppointment(int appointmentId, [FromBody] Appointment updatedAppointment)
        {
            var existing = _context.Appointments.Find(appointmentId);

            if (existing == null)
            {
                return NotFound(new { message = "Appointment not found" });
            }

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
            _context.SaveChanges();

            return Ok(existing);
        }

        // ── Events (admin/manager calendar events) ──

        [HttpGet("AllEvents")]
        public IActionResult GetAllEvents(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "EventDate",
            string sortOrder = "desc",
            int? safehouseId = null,
            [FromQuery] List<string>? eventTypes = null,
            [FromQuery] List<string>? statuses = null)
        {
            var query = _context.Events.AsQueryable();

            if (safehouseId.HasValue)
            {
                query = query.Where(e => e.SafehouseId == safehouseId.Value || e.SafehouseId == null);
            }

            if (eventTypes != null && eventTypes.Any())
            {
                query = query.Where(e => eventTypes.Contains(e.EventType));
            }

            if (statuses != null && statuses.Any())
            {
                query = query.Where(e => statuses.Contains(e.Status));
            }

            query = sortBy switch
            {
                "EventDate" => sortOrder == "desc" ? query.OrderByDescending(e => e.EventDate) : query.OrderBy(e => e.EventDate),
                "EventType" => sortOrder == "desc" ? query.OrderByDescending(e => e.EventType) : query.OrderBy(e => e.EventType),
                "Title" => sortOrder == "desc" ? query.OrderByDescending(e => e.Title) : query.OrderBy(e => e.Title),
                "Status" => sortOrder == "desc" ? query.OrderByDescending(e => e.Status) : query.OrderBy(e => e.Status),
                _ => sortOrder == "desc" ? query.OrderByDescending(e => e.EventDate) : query.OrderBy(e => e.EventDate)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetEvent/{eventId}")]
        public IActionResult GetEvent(int eventId)
        {
            var ev = _context.Events.Find(eventId);

            if (ev == null)
            {
                return NotFound(new { message = "Event not found" });
            }

            return Ok(ev);
        }

        [HttpPost("AddEvent")]
        public IActionResult AddEvent([FromBody] Event newEvent)
        {
            _context.Events.Add(newEvent);
            _context.SaveChanges();
            return Ok(newEvent);
        }

        [HttpPut("UpdateEvent/{eventId}")]
        public IActionResult UpdateEvent(int eventId, [FromBody] Event updatedEvent)
        {
            var existing = _context.Events.Find(eventId);

            if (existing == null)
            {
                return NotFound(new { message = "Event not found" });
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
            _context.SaveChanges();

            return Ok(existing);
        }
    }
}
