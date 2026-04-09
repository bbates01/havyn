using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SocialMediaPostsController : ControllerBase
    {
        private HavynDbContext _context;

        public SocialMediaPostsController(HavynDbContext temp) => _context = temp;

        [HttpGet("AllPosts")]
        public IActionResult GetAllPosts(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "CreatedAt",
            string sortOrder = "desc",
            [FromQuery] List<string>? platforms = null,
            string? campaignName = null,
            string? startDate = null,
            string? endDate = null)
        {
            var query = _context.SocialMediaPosts.AsQueryable();

            if (platforms != null && platforms.Any())
            {
                query = query.Where(p => platforms.Contains(p.Platform));
            }

            if (!string.IsNullOrEmpty(campaignName))
            {
                query = query.Where(p => p.CampaignName == campaignName);
            }

            if (!string.IsNullOrEmpty(startDate))
            {
                var start = DateTime.Parse(startDate);
                query = query.Where(p => p.CreatedAt >= start);
            }

            if (!string.IsNullOrEmpty(endDate))
            {
                var end = DateTime.Parse(endDate);
                query = query.Where(p => p.CreatedAt <= end);
            }

            query = sortBy switch
            {
                "CreatedAt" => sortOrder == "desc" ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt),
                "EngagementRate" => sortOrder == "desc" ? query.OrderByDescending(p => p.EngagementRate) : query.OrderBy(p => p.EngagementRate),
                "DonationReferrals" => sortOrder == "desc" ? query.OrderByDescending(p => p.DonationReferrals) : query.OrderBy(p => p.DonationReferrals),
                "Platform" => sortOrder == "desc" ? query.OrderByDescending(p => p.Platform) : query.OrderBy(p => p.Platform),
                _ => sortOrder == "desc" ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetPost/{postId}")]
        public IActionResult GetPost(int postId)
        {
            var post = _context.SocialMediaPosts.Find(postId);

            if (post == null)
            {
                return NotFound(new { message = "Social media post not found" });
            }

            return Ok(post);
        }
    }
}
