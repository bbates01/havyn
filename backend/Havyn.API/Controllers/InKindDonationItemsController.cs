using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Havyn.Data;

namespace Havyn.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "InternalStaff")]
    public class InKindDonationItemsController : ControllerBase
    {
        private HavynDbContext _context;

        public InKindDonationItemsController(HavynDbContext temp) => _context = temp;

        [HttpGet("ByDonation/{donationId}")]
        public IActionResult GetByDonation(int donationId)
        {
            var items = _context.InKindDonationItems
                .Where(i => i.DonationId == donationId)
                .ToList();

            return Ok(items);
        }

        [HttpGet("GetItem/{itemId}")]
        public IActionResult GetItem(int itemId)
        {
            var item = _context.InKindDonationItems.Find(itemId);

            if (item == null)
            {
                return NotFound(new { message = "In-kind donation item not found" });
            }

            return Ok(item);
        }

        [HttpPost("AddItem")]
        public IActionResult AddItem([FromBody] InKindDonationItem newItem)
        {
            _context.InKindDonationItems.Add(newItem);
            _context.SaveChanges();
            return Ok(newItem);
        }

        [HttpPut("UpdateItem/{itemId}")]
        public IActionResult UpdateItem(int itemId, [FromBody] InKindDonationItem updatedItem)
        {
            var existing = _context.InKindDonationItems.Find(itemId);

            if (existing == null)
            {
                return NotFound(new { message = "In-kind donation item not found" });
            }

            existing.DonationId = updatedItem.DonationId;
            existing.ItemName = updatedItem.ItemName;
            existing.ItemCategory = updatedItem.ItemCategory;
            existing.Quantity = updatedItem.Quantity;
            existing.UnitOfMeasure = updatedItem.UnitOfMeasure;
            existing.EstimatedUnitValue = updatedItem.EstimatedUnitValue;
            existing.IntendedUse = updatedItem.IntendedUse;
            existing.ReceivedCondition = updatedItem.ReceivedCondition;

            _context.InKindDonationItems.Update(existing);
            _context.SaveChanges();

            return Ok(existing);
        }
    }
}
