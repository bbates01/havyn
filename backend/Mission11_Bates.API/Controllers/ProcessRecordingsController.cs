using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProcessRecordingsController : ControllerBase
    {
        private HavynDbContext _context;

        public ProcessRecordingsController(HavynDbContext temp) => _context = temp;

        [HttpGet("AllRecordings")]
        public IActionResult GetAllRecordings(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "SessionDate",
            string sortOrder = "desc",
            int? residentId = null,
            string? socialWorker = null)
        {
            var query = _context.ProcessRecordings.AsQueryable();

            if (residentId.HasValue)
            {
                query = query.Where(pr => pr.ResidentId == residentId.Value);
            }

            if (!string.IsNullOrEmpty(socialWorker))
            {
                query = query.Where(pr => pr.SocialWorker == socialWorker);
            }

            query = sortBy switch
            {
                "SessionDate" => sortOrder == "desc" ? query.OrderByDescending(pr => pr.SessionDate) : query.OrderBy(pr => pr.SessionDate),
                "SessionType" => sortOrder == "desc" ? query.OrderByDescending(pr => pr.SessionType) : query.OrderBy(pr => pr.SessionType),
                _ => sortOrder == "desc" ? query.OrderByDescending(pr => pr.SessionDate) : query.OrderBy(pr => pr.SessionDate)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetRecording/{recordingId}")]
        public IActionResult GetRecording(int recordingId)
        {
            var recording = _context.ProcessRecordings.Find(recordingId);

            if (recording == null)
            {
                return NotFound(new { message = "Process recording not found" });
            }

            return Ok(recording);
        }

        [HttpPost("AddRecording")]
        public IActionResult AddRecording([FromBody] ProcessRecording newRecording, int? appointmentId = null)
        {
            _context.ProcessRecordings.Add(newRecording);
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

            return Ok(newRecording);
        }
    }
}
