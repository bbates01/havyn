using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DonationsController : ControllerBase
    {
        private HavynDbContext _context;

        public DonationsController(HavynDbContext temp) => _context = temp;

        [HttpGet("AllDonations")]
        public IActionResult GetAllDonations(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "DonationDate",
            string sortOrder = "desc",
            int? supporterId = null,
            [FromQuery] List<string>? donationTypes = null,
            string? campaignName = null,
            string? channelSource = null,
            bool? isRecurring = null,
            string? startDate = null,
            string? endDate = null)
        {
            var query = _context.Donations.AsQueryable();

            if (supporterId.HasValue)
            {
                query = query.Where(d => d.SupporterId == supporterId.Value);
            }

            if (donationTypes != null && donationTypes.Any())
            {
                query = query.Where(d => donationTypes.Contains(d.DonationType));
            }

            if (!string.IsNullOrEmpty(campaignName))
            {
                query = query.Where(d => d.CampaignName == campaignName);
            }

            if (!string.IsNullOrEmpty(channelSource))
            {
                query = query.Where(d => d.ChannelSource == channelSource);
            }

            if (isRecurring.HasValue)
            {
                query = query.Where(d => d.IsRecurring == isRecurring.Value);
            }

            if (!string.IsNullOrEmpty(startDate))
            {
                var start = DateOnly.Parse(startDate);
                query = query.Where(d => d.DonationDate >= start);
            }

            if (!string.IsNullOrEmpty(endDate))
            {
                var end = DateOnly.Parse(endDate);
                query = query.Where(d => d.DonationDate <= end);
            }

            query = sortBy switch
            {
                "DonationDate" => sortOrder == "desc" ? query.OrderByDescending(d => d.DonationDate) : query.OrderBy(d => d.DonationDate),
                "Amount" => sortOrder == "desc" ? query.OrderByDescending(d => d.Amount) : query.OrderBy(d => d.Amount),
                "SupporterId" => sortOrder == "desc" ? query.OrderByDescending(d => d.SupporterId) : query.OrderBy(d => d.SupporterId),
                _ => sortOrder == "desc" ? query.OrderByDescending(d => d.DonationDate) : query.OrderBy(d => d.DonationDate)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetDonation/{donationId}")]
        public IActionResult GetDonation(int donationId)
        {
            var donation = _context.Donations.Find(donationId);

            if (donation == null)
            {
                return NotFound(new { message = "Donation not found" });
            }

            return Ok(donation);
        }

        [HttpPost("AddDonation")]
        public IActionResult AddDonation([FromBody] Donation newDonation)
        {
            _context.Donations.Add(newDonation);
            _context.SaveChanges();
            return Ok(newDonation);
        }

        [HttpPut("UpdateDonation/{donationId}")]
        public IActionResult UpdateDonation(int donationId, [FromBody] Donation updatedDonation)
        {
            var existing = _context.Donations.Find(donationId);

            if (existing == null)
            {
                return NotFound(new { message = "Donation not found" });
            }

            existing.SupporterId = updatedDonation.SupporterId;
            existing.DonationType = updatedDonation.DonationType;
            existing.DonationDate = updatedDonation.DonationDate;
            existing.IsRecurring = updatedDonation.IsRecurring;
            existing.CampaignName = updatedDonation.CampaignName;
            existing.ChannelSource = updatedDonation.ChannelSource;
            existing.CurrencyCode = updatedDonation.CurrencyCode;
            existing.Amount = updatedDonation.Amount;
            existing.EstimatedValue = updatedDonation.EstimatedValue;
            existing.ImpactUnit = updatedDonation.ImpactUnit;
            existing.Notes = updatedDonation.Notes;

            _context.Donations.Update(existing);
            _context.SaveChanges();

            return Ok(existing);
        }
    }
}
