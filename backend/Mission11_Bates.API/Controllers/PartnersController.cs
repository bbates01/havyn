using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "InternalStaff")]
    public class PartnersController : ControllerBase
    {
        private HavynDbContext _context;

        public PartnersController(HavynDbContext temp) => _context = temp;

        [HttpGet("AllPartners")]
        public IActionResult GetAllPartners(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "PartnerName",
            string sortOrder = "asc",
            [FromQuery] List<string>? roleTypes = null,
            string? region = null,
            [FromQuery] List<string>? statuses = null)
        {
            var query = _context.Partners.AsQueryable();

            if (roleTypes != null && roleTypes.Any())
            {
                query = query.Where(p => roleTypes.Contains(p.RoleType));
            }

            if (!string.IsNullOrEmpty(region))
            {
                query = query.Where(p => p.Region == region);
            }

            if (statuses != null && statuses.Any())
            {
                query = query.Where(p => statuses.Contains(p.Status));
            }

            query = sortBy switch
            {
                "PartnerName" => sortOrder == "desc" ? query.OrderByDescending(p => p.PartnerName) : query.OrderBy(p => p.PartnerName),
                "Status" => sortOrder == "desc" ? query.OrderByDescending(p => p.Status) : query.OrderBy(p => p.Status),
                "StartDate" => sortOrder == "desc" ? query.OrderByDescending(p => p.StartDate) : query.OrderBy(p => p.StartDate),
                "Region" => sortOrder == "desc" ? query.OrderByDescending(p => p.Region) : query.OrderBy(p => p.Region),
                _ => sortOrder == "desc" ? query.OrderByDescending(p => p.PartnerName) : query.OrderBy(p => p.PartnerName)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetPartner/{partnerId}")]
        public IActionResult GetPartner(int partnerId)
        {
            var partner = _context.Partners.Find(partnerId);

            if (partner == null)
            {
                return NotFound(new { message = "Partner not found" });
            }

            return Ok(partner);
        }

        [HttpPost("AddPartner")]
        [Authorize(Policy = "AdminOnly")]
        public IActionResult AddPartner([FromBody] Partner newPartner)
        {
            _context.Partners.Add(newPartner);
            _context.SaveChanges();
            return Ok(newPartner);
        }

        [HttpPut("UpdatePartner/{partnerId}")]
        [Authorize(Policy = "AdminOnly")]
        public IActionResult UpdatePartner(int partnerId, [FromBody] Partner updatedPartner)
        {
            var existing = _context.Partners.Find(partnerId);

            if (existing == null)
            {
                return NotFound(new { message = "Partner not found" });
            }

            existing.PartnerName = updatedPartner.PartnerName;
            existing.PartnerType = updatedPartner.PartnerType;
            existing.RoleType = updatedPartner.RoleType;
            existing.ContactName = updatedPartner.ContactName;
            existing.Email = updatedPartner.Email;
            existing.Phone = updatedPartner.Phone;
            existing.Region = updatedPartner.Region;
            existing.Status = updatedPartner.Status;
            existing.StartDate = updatedPartner.StartDate;
            existing.EndDate = updatedPartner.EndDate;
            existing.Notes = updatedPartner.Notes;

            _context.Partners.Update(existing);
            _context.SaveChanges();

            return Ok(existing);
        }
    }
}
