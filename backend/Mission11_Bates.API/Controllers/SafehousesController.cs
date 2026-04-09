using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SafehousesController : ControllerBase
    {
        private HavynDbContext _context;

        public SafehousesController(HavynDbContext temp) => _context = temp;

        [HttpGet("AllSafehouses")]
        public IActionResult GetAllSafehouses(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "Name",
            string sortOrder = "asc",
            bool includeInactive = false)
        {
            var query = _context.Safehouses.AsQueryable();

            if (!includeInactive)
            {
                query = query.Where(s => s.Status == "Active");
            }

            query = sortBy switch
            {
                "Name" => sortOrder == "desc" ? query.OrderByDescending(s => s.Name) : query.OrderBy(s => s.Name),
                "Region" => sortOrder == "desc" ? query.OrderByDescending(s => s.Region) : query.OrderBy(s => s.Region),
                "CurrentOccupancy" => sortOrder == "desc" ? query.OrderByDescending(s => s.CurrentOccupancy) : query.OrderBy(s => s.CurrentOccupancy),
                "Status" => sortOrder == "desc" ? query.OrderByDescending(s => s.Status) : query.OrderBy(s => s.Status),
                _ => sortOrder == "desc" ? query.OrderByDescending(s => s.Name) : query.OrderBy(s => s.Name)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("GetSafehouse/{safehouseId}")]
        public IActionResult GetSafehouse(int safehouseId)
        {
            var safehouse = _context.Safehouses.Find(safehouseId);

            if (safehouse == null)
            {
                return NotFound(new { message = "Safehouse not found" });
            }

            return Ok(safehouse);
        }
    }
}
