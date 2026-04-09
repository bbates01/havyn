using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HealthWellbeingRecordsController : ControllerBase
    {
        private HavynDbContext _context;

        public HealthWellbeingRecordsController(HavynDbContext temp) => _context = temp;

        [HttpGet("AllRecords")]
        public IActionResult GetAllRecords(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "RecordDate",
            string sortOrder = "desc",
            int? residentId = null)
        {
            var query = _context.HealthWellbeingRecords.AsQueryable();

            if (residentId.HasValue)
            {
                query = query.Where(hr => hr.ResidentId == residentId.Value);
            }

            query = sortBy switch
            {
                "RecordDate" => sortOrder == "desc" ? query.OrderByDescending(hr => hr.RecordDate) : query.OrderBy(hr => hr.RecordDate),
                "GeneralHealthScore" => sortOrder == "desc" ? query.OrderByDescending(hr => hr.GeneralHealthScore) : query.OrderBy(hr => hr.GeneralHealthScore),
                _ => sortOrder == "desc" ? query.OrderByDescending(hr => hr.RecordDate) : query.OrderBy(hr => hr.RecordDate)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetRecord/{healthRecordId}")]
        public IActionResult GetRecord(int healthRecordId)
        {
            var record = _context.HealthWellbeingRecords.Find(healthRecordId);

            if (record == null)
            {
                return NotFound(new { message = "Health wellbeing record not found" });
            }

            return Ok(record);
        }

        [HttpPost("AddRecord")]
        public IActionResult AddRecord([FromBody] HealthWellbeingRecord newRecord)
        {
            _context.HealthWellbeingRecords.Add(newRecord);
            _context.SaveChanges();
            return Ok(newRecord);
        }
    }
}
