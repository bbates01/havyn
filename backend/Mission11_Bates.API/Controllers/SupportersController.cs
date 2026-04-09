using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class SupportersController : ControllerBase
    {
        private HavynDbContext _context;

        public SupportersController(HavynDbContext temp) => _context = temp;

        [HttpGet("AllSupporters")]
        public IActionResult GetAllSupporters(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "DisplayName",
            string sortOrder = "asc",
            [FromQuery] List<string>? supporterTypes = null,
            [FromQuery] List<string>? relationshipTypes = null,
            [FromQuery] List<string>? statuses = null,
            string? region = null,
            string? country = null,
            string? acquisitionChannel = null)
        {
            var query = _context.Supporters.AsQueryable();

            if (supporterTypes != null && supporterTypes.Any())
            {
                query = query.Where(s => supporterTypes.Contains(s.SupporterType));
            }

            if (relationshipTypes != null && relationshipTypes.Any())
            {
                query = query.Where(s => relationshipTypes.Contains(s.RelationshipType));
            }

            if (statuses != null && statuses.Any())
            {
                query = query.Where(s => statuses.Contains(s.Status));
            }

            if (!string.IsNullOrEmpty(region))
            {
                query = query.Where(s => s.Region == region);
            }

            if (!string.IsNullOrEmpty(country))
            {
                query = query.Where(s => s.Country == country);
            }

            if (!string.IsNullOrEmpty(acquisitionChannel))
            {
                query = query.Where(s => s.AcquisitionChannel == acquisitionChannel);
            }

            query = sortBy switch
            {
                "DisplayName" => sortOrder == "desc" ? query.OrderByDescending(s => s.DisplayName) : query.OrderBy(s => s.DisplayName),
                "FirstDonationDate" => sortOrder == "desc" ? query.OrderByDescending(s => s.FirstDonationDate) : query.OrderBy(s => s.FirstDonationDate),
                "Status" => sortOrder == "desc" ? query.OrderByDescending(s => s.Status) : query.OrderBy(s => s.Status),
                _ => sortOrder == "desc" ? query.OrderByDescending(s => s.DisplayName) : query.OrderBy(s => s.DisplayName)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetSupporter/{supporterId}")]
        public IActionResult GetSupporter(int supporterId)
        {
            var supporter = _context.Supporters.Find(supporterId);

            if (supporter == null)
            {
                return NotFound(new { message = "Supporter not found" });
            }

            return Ok(supporter);
        }

        [HttpPost("AddSupporter")]
        public IActionResult AddSupporter([FromBody] Supporter newSupporter)
        {
            _context.Supporters.Add(newSupporter);
            _context.SaveChanges();
            return Ok(newSupporter);
        }

        [HttpPut("UpdateSupporter/{supporterId}")]
        public IActionResult UpdateSupporter(int supporterId, [FromBody] Supporter updatedSupporter)
        {
            var existing = _context.Supporters.Find(supporterId);

            if (existing == null)
            {
                return NotFound(new { message = "Supporter not found" });
            }

            existing.SupporterType = updatedSupporter.SupporterType;
            existing.DisplayName = updatedSupporter.DisplayName;
            existing.OrganizationName = updatedSupporter.OrganizationName;
            existing.FirstName = updatedSupporter.FirstName;
            existing.LastName = updatedSupporter.LastName;
            existing.RelationshipType = updatedSupporter.RelationshipType;
            existing.Region = updatedSupporter.Region;
            existing.Country = updatedSupporter.Country;
            existing.Email = updatedSupporter.Email;
            existing.Phone = updatedSupporter.Phone;
            existing.Status = updatedSupporter.Status;
            existing.AcquisitionChannel = updatedSupporter.AcquisitionChannel;

            _context.Supporters.Update(existing);
            _context.SaveChanges();

            return Ok(existing);
        }
    }
}
