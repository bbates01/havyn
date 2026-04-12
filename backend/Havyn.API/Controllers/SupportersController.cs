using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Havyn.Data;

namespace Havyn.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "DonorRecordManagement")]
    public class SupportersController : ControllerBase
    {
        private readonly HavynDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public SupportersController(HavynDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

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

        [HttpDelete("DeleteSupporter/{supporterId}")]
        public async Task<IActionResult> DeleteSupporter(int supporterId)
        {
            var existing = await _context.Supporters.FindAsync(supporterId);
            if (existing == null)
                return NotFound(new { message = "Supporter not found" });

            if (await _context.Donations.AnyAsync(d => d.SupporterId == supporterId))
                return BadRequest(new { message = "Cannot delete a supporter with donation history." });

            if (!string.IsNullOrEmpty(existing.UserId))
            {
                var user = await _userManager.FindByIdAsync(existing.UserId);
                if (user != null)
                {
                    var result = await _userManager.DeleteAsync(user);
                    if (!result.Succeeded)
                    {
                        var err = string.Join(" ", result.Errors.Select(e => e.Description));
                        return BadRequest(new { message = string.IsNullOrEmpty(err) ? "Could not delete linked login account." : err });
                    }
                }
            }

            _context.Supporters.Remove(existing);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
