using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "InternalStaff")]
    public class DonationAllocationsController : ControllerBase
    {
        private HavynDbContext _context;

        public DonationAllocationsController(HavynDbContext temp) => _context = temp;

        [HttpGet("ByDonation/{donationId}")]
        public IActionResult GetByDonation(int donationId)
        {
            var allocations = _context.DonationAllocations
                .Where(da => da.DonationId == donationId)
                .ToList();

            return Ok(allocations);
        }

        [HttpGet("GetAllocation/{allocationId}")]
        public IActionResult GetAllocation(int allocationId)
        {
            var allocation = _context.DonationAllocations.Find(allocationId);

            if (allocation == null)
            {
                return NotFound(new { message = "Donation allocation not found" });
            }

            return Ok(allocation);
        }

        [HttpPost("AddAllocation")]
        public IActionResult AddAllocation([FromBody] DonationAllocation newAllocation)
        {
            _context.DonationAllocations.Add(newAllocation);
            _context.SaveChanges();
            return Ok(newAllocation);
        }

        [HttpPut("UpdateAllocation/{allocationId}")]
        public IActionResult UpdateAllocation(int allocationId, [FromBody] DonationAllocation updatedAllocation)
        {
            var existing = _context.DonationAllocations.Find(allocationId);

            if (existing == null)
            {
                return NotFound(new { message = "Donation allocation not found" });
            }

            existing.DonationId = updatedAllocation.DonationId;
            existing.SafehouseId = updatedAllocation.SafehouseId;
            existing.ProgramArea = updatedAllocation.ProgramArea;
            existing.AmountAllocated = updatedAllocation.AmountAllocated;
            existing.AllocationDate = updatedAllocation.AllocationDate;
            existing.AllocationNotes = updatedAllocation.AllocationNotes;

            _context.DonationAllocations.Update(existing);
            _context.SaveChanges();

            return Ok(existing);
        }
    }
}
