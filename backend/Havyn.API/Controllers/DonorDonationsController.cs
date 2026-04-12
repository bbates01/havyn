using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Havyn.Data;
using Havyn.Dtos;

namespace Havyn.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "DonorAccess")]
    public class DonorDonationsController : ControllerBase
    {
        private static readonly string[] AllowedRecurringFrequencies = ["Monthly", "Quarterly", "Yearly"];

        private readonly HavynDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IOptions<JsonOptions> _jsonOptions;

        public DonorDonationsController(
            HavynDbContext context,
            UserManager<ApplicationUser> userManager,
            IOptions<JsonOptions> jsonOptions)
        {
            _context = context;
            _userManager = userManager;
            _jsonOptions = jsonOptions;
        }

        private static (string? Frequency, string? Error) ResolveRecurringFrequency(bool isRecurring, string? requested)
        {
            if (!isRecurring)
                return (null, null);

            var raw = string.IsNullOrWhiteSpace(requested) ? "Monthly" : requested.Trim();
            foreach (var allowed in AllowedRecurringFrequencies)
            {
                if (string.Equals(allowed, raw, StringComparison.OrdinalIgnoreCase))
                    return (allowed, null);
            }

            return (null, "Recurring frequency must be Monthly, Quarterly, or Yearly.");
        }

        private async Task<(IActionResult? Error, int SupporterId)> RequireSupporterIdAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user?.SupporterId is not int sid)
                return (StatusCode(403, new { message = "Your account is not linked to a supporter profile." }), 0);

            return (null, sid);
        }

        private IActionResult JsonOk(object value)
        {
            var json = JsonSerializer.Serialize(value, _jsonOptions.Value.JsonSerializerOptions);
            return new ContentResult
            {
                Content = json,
                ContentType = "application/json",
                StatusCode = 200,
            };
        }

        [HttpGet("MyDonations")]
        public async Task<IActionResult> GetMyDonations(
            int pageSize = 25,
            int pageIndex = 1,
            bool? recurringOnly = null)
        {
            var (err, supporterId) = await RequireSupporterIdAsync();
            if (err != null) return err;

            if (pageIndex < 1 || pageSize < 1 || pageSize > 500)
                return BadRequest(new { message = "Invalid pageIndex or pageSize." });

            var baseQuery = _context.Donations
                .AsNoTracking()
                .Where(d => d.SupporterId == supporterId);

            if (recurringOnly == true)
                baseQuery = baseQuery.Where(d => d.IsRecurring);

            var ordered = baseQuery
                .OrderByDescending(d => d.DonationDate)
                .ThenByDescending(d => d.DonationId);

            var totalCount = await ordered.CountAsync();

            var items = await ordered
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .Select(d => new DonorMyDonationRowDto
                {
                    DonationId = d.DonationId,
                    SupporterId = d.SupporterId,
                    DonationType = d.DonationType ?? "",
                    DonationDate = d.DonationDate,
                    IsRecurring = d.IsRecurring,
                    RecurringFrequency = d.RecurringFrequency,
                    CampaignName = d.CampaignName,
                    ChannelSource = d.ChannelSource ?? "",
                    CurrencyCode = d.CurrencyCode,
                    Amount = d.Amount,
                    EstimatedValue = d.EstimatedValue,
                    ImpactUnit = d.ImpactUnit ?? "",
                    Notes = d.Notes,
                    ReferralPostId = d.ReferralPostId,
                })
                .ToListAsync();

            return JsonOk(new { Items = items, TotalCount = totalCount });
        }

        [HttpPost("MyDonations")]
        public async Task<IActionResult> CreateMyDonation([FromBody] DonorCreateDonationDto? dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Request body is required." });

            if (dto.Amount <= 0)
                return BadRequest(new { message = "Amount must be greater than zero." });

            var (freq, freqErr) = ResolveRecurringFrequency(dto.IsRecurring, dto.RecurringFrequency);
            if (freqErr != null)
                return BadRequest(new { message = freqErr });

            var (err, supporterId) = await RequireSupporterIdAsync();
            if (err != null) return err;

            var amt = (float)dto.Amount;
            var donationId = await _context.NextDonationIdAsync(HttpContext.RequestAborted);
            var donation = new Donation
            {
                DonationId = donationId,
                SupporterId = supporterId,
                DonationType = "Monetary",
                DonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
                IsRecurring = dto.IsRecurring,
                RecurringFrequency = freq,
                CampaignName = string.IsNullOrWhiteSpace(dto.CampaignName) ? null : dto.CampaignName.Trim(),
                ChannelSource = "DonorPortal",
                CurrencyCode = "PHP",
                Amount = amt,
                EstimatedValue = amt,
                ImpactUnit = "PHP",
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim()
            };

            _context.Donations.Add(donation);
            await _context.SaveChangesAsync();

            return JsonOk(MapToRow(donation));
        }

        [HttpPut("MyDonations/{donationId:int}")]
        public async Task<IActionResult> UpdateMyDonation(int donationId, [FromBody] DonorUpdateDonationDto? dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Request body is required." });

            var (err, supporterId) = await RequireSupporterIdAsync();
            if (err != null) return err;

            var existing = await _context.Donations.FindAsync(donationId);
            if (existing == null)
                return NotFound(new { message = "Donation not found" });

            if (existing.SupporterId != supporterId)
                return StatusCode(403, new { message = "You can only update your own donations." });

            existing.IsRecurring = dto.IsRecurring;

            if (!dto.IsRecurring)
            {
                existing.RecurringFrequency = null;
            }
            else
            {
                var requested = dto.RecurringFrequency ?? existing.RecurringFrequency;
                var (freq, freqErr) = ResolveRecurringFrequency(true, requested);
                if (freqErr != null)
                    return BadRequest(new { message = freqErr });
                existing.RecurringFrequency = freq;
            }

            if (dto.Amount.HasValue)
            {
                if (dto.Amount.Value <= 0)
                    return BadRequest(new { message = "Amount must be greater than zero." });
                var f = (float)dto.Amount.Value;
                existing.Amount = f;
                existing.EstimatedValue = f;
            }

            if (dto.Notes != null)
                existing.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();

            await _context.SaveChangesAsync();

            return JsonOk(MapToRow(existing));
        }

        private static DonorMyDonationRowDto MapToRow(Donation d) => new()
        {
            DonationId = d.DonationId,
            SupporterId = d.SupporterId,
            DonationType = d.DonationType ?? "",
            DonationDate = d.DonationDate,
            IsRecurring = d.IsRecurring,
            RecurringFrequency = d.RecurringFrequency,
            CampaignName = d.CampaignName,
            ChannelSource = d.ChannelSource ?? "",
            CurrencyCode = d.CurrencyCode,
            Amount = d.Amount,
            EstimatedValue = d.EstimatedValue,
            ImpactUnit = d.ImpactUnit ?? "",
            Notes = d.Notes,
            ReferralPostId = d.ReferralPostId,
        };
    }
}
