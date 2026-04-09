using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HomeVisitationsController : ControllerBase
    {
        private HavynDbContext _context;

        public HomeVisitationsController(HavynDbContext temp) => _context = temp;

        [HttpGet("AllVisitations")]
        public IActionResult GetAllVisitations(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "VisitDate",
            string sortOrder = "desc",
            int? residentId = null,
            string? socialWorker = null)
        {
            var query = _context.HomeVisitations.AsQueryable();

            if (residentId.HasValue)
            {
                query = query.Where(hv => hv.ResidentId == residentId.Value);
            }

            if (!string.IsNullOrEmpty(socialWorker))
            {
                query = query.Where(hv => hv.SocialWorker == socialWorker);
            }

            query = sortBy switch
            {
                "VisitDate" => sortOrder == "desc" ? query.OrderByDescending(hv => hv.VisitDate) : query.OrderBy(hv => hv.VisitDate),
                "VisitType" => sortOrder == "desc" ? query.OrderByDescending(hv => hv.VisitType) : query.OrderBy(hv => hv.VisitType),
                _ => sortOrder == "desc" ? query.OrderByDescending(hv => hv.VisitDate) : query.OrderBy(hv => hv.VisitDate)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetVisitation/{visitationId}")]
        public IActionResult GetVisitation(int visitationId)
        {
            var visitation = _context.HomeVisitations.Find(visitationId);

            if (visitation == null)
            {
                return NotFound(new { message = "Home visitation not found" });
            }

            return Ok(visitation);
        }

        [HttpPost("AddVisitation")]
        public IActionResult AddVisitation([FromBody] HomeVisitation newVisitation, int? appointmentId = null)
        {
            _context.HomeVisitations.Add(newVisitation);
            _context.SaveChanges();

            if (appointmentId.HasValue)
            {
                var appointment = _context.Appointments.Find(appointmentId.Value);
                if (appointment != null && appointment.Status == "Scheduled")
                {
                    appointment.Status = "Completed";
                    _context.Appointments.Update(appointment);
                    _context.SaveChanges();
                }
            }

            return Ok(newVisitation);
        }
    }
}
