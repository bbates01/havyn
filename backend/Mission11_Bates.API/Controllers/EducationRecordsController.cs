using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EducationRecordsController : ControllerBase
    {
        private HavynDbContext _context;

        public EducationRecordsController(HavynDbContext temp) => _context = temp;

        [HttpGet("AllRecords")]
        public IActionResult GetAllRecords(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "RecordDate",
            string sortOrder = "desc",
            int? residentId = null)
        {
            var query = _context.EducationRecords.AsQueryable();

            if (residentId.HasValue)
            {
                query = query.Where(er => er.ResidentId == residentId.Value);
            }

            query = sortBy switch
            {
                "RecordDate" => sortOrder == "desc" ? query.OrderByDescending(er => er.RecordDate) : query.OrderBy(er => er.RecordDate),
                "EducationLevel" => sortOrder == "desc" ? query.OrderByDescending(er => er.EducationLevel) : query.OrderBy(er => er.EducationLevel),
                "ProgressPercent" => sortOrder == "desc" ? query.OrderByDescending(er => er.ProgressPercent) : query.OrderBy(er => er.ProgressPercent),
                _ => sortOrder == "desc" ? query.OrderByDescending(er => er.RecordDate) : query.OrderBy(er => er.RecordDate)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetRecord/{educationRecordId}")]
        public IActionResult GetRecord(int educationRecordId)
        {
            var record = _context.EducationRecords.Find(educationRecordId);

            if (record == null)
            {
                return NotFound(new { message = "Education record not found" });
            }

            return Ok(record);
        }

        [HttpPost("AddRecord")]
        public IActionResult AddRecord([FromBody] EducationRecord newRecord)
        {
            _context.EducationRecords.Add(newRecord);
            _context.SaveChanges();
            return Ok(newRecord);
        }
    }
}
