using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Havyn.Contracts;
using Havyn.Data;

namespace Havyn.Controllers
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
        public IActionResult AddPartner([FromBody] PartnerUpsertRequest body)
        {
            if (!TryMapPartner(body, out var entity, out var error))
            {
                return BadRequest(new { message = error });
            }

            // Assign PartnerId explicitly (DB column is NOT auto-generated).
            entity.PartnerId = (_context.Partners.Max(p => (int?)p.PartnerId) ?? 0) + 1;

            _context.Partners.Add(entity);
            _context.SaveChanges();
            return Ok(entity);
        }

        [HttpPut("UpdatePartner/{partnerId}")]
        [Authorize(Policy = "AdminOnly")]
        public IActionResult UpdatePartner(int partnerId, [FromBody] PartnerUpsertRequest body)
        {
            var existing = _context.Partners.Find(partnerId);

            if (existing == null)
            {
                return NotFound(new { message = "Partner not found" });
            }

            if (!TryMapPartner(body, out var mapped, out var error))
            {
                return BadRequest(new { message = error });
            }

            existing.PartnerName = mapped.PartnerName;
            existing.PartnerType = mapped.PartnerType;
            existing.RoleType = mapped.RoleType;
            existing.ContactName = mapped.ContactName;
            existing.Email = mapped.Email;
            existing.Phone = mapped.Phone;
            existing.Region = mapped.Region;
            existing.Status = mapped.Status;
            existing.StartDate = mapped.StartDate;
            existing.EndDate = mapped.EndDate;
            existing.Notes = mapped.Notes;

            _context.Partners.Update(existing);
            _context.SaveChanges();

            return Ok(existing);
        }

        /// <summary>Maps request JSON to a Partner row; validates required fields and dates.</summary>
        private static bool TryMapPartner(PartnerUpsertRequest? body, out Partner partner, out string error)
        {
            partner = null!;
            error = string.Empty;

            if (body == null)
            {
                error = "Request body is required.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(body.PartnerName))
            {
                error = "Partner name is required.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(body.PartnerType))
            {
                error = "Partner type is required.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(body.RoleType))
            {
                error = "Role type is required.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(body.ContactName))
            {
                error = "Contact name is required.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(body.Email))
            {
                error = "Email is required.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(body.Phone))
            {
                error = "Phone is required.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(body.Region))
            {
                error = "Region is required.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(body.Status))
            {
                error = "Status is required.";
                return false;
            }

            if (string.IsNullOrWhiteSpace(body.StartDate) ||
                !TryParseDateOnlyLoose(body.StartDate, out var startDate))
            {
                error = "Start date is required and must be a valid date (yyyy-MM-dd).";
                return false;
            }

            DateOnly? endDate = null;
            if (!string.IsNullOrWhiteSpace(body.EndDate))
            {
                if (!TryParseDateOnlyLoose(body.EndDate, out var ed))
                {
                    error = "End date must be a valid date (yyyy-MM-dd).";
                    return false;
                }

                endDate = ed;
            }

            partner = new Partner
            {
                PartnerName = body.PartnerName.Trim(),
                PartnerType = body.PartnerType.Trim(),
                RoleType = body.RoleType.Trim(),
                ContactName = body.ContactName.Trim(),
                Email = body.Email.Trim(),
                Phone = body.Phone.Trim(),
                Region = body.Region.Trim(),
                Status = body.Status.Trim(),
                StartDate = startDate,
                EndDate = endDate,
                Notes = string.IsNullOrWhiteSpace(body.Notes) ? null : body.Notes.Trim(),
            };

            return true;
        }

        private static bool TryParseDateOnlyLoose(string? s, out DateOnly result)
        {
            result = default;
            if (string.IsNullOrWhiteSpace(s)) return false;
            if (DateOnly.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out result))
                return true;
            if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
            {
                result = DateOnly.FromDateTime(dt);
                return true;
            }

            return false;
        }

        [HttpDelete("DeletePartner/{partnerId}")]
        [Authorize(Policy = "AdminOnly")]
        public IActionResult DeletePartner(int partnerId)
        {
            var existing = _context.Partners.Find(partnerId);

            if (existing == null)
            {
                return NotFound(new { message = "Partner not found" });
            }

            var assignments = _context.PartnerAssignments
                .Where(a => a.PartnerId == partnerId)
                .ToList();
            _context.PartnerAssignments.RemoveRange(assignments);

            _context.Partners.Remove(existing);
            _context.SaveChanges();

            return NoContent();
        }
    }
}
