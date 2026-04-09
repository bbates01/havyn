using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class PartnerAssignmentsController : ControllerBase
    {
        private HavynDbContext _context;

        public PartnerAssignmentsController(HavynDbContext temp) => _context = temp;

        [HttpGet("ByPartner/{partnerId}")]
        public IActionResult GetByPartner(int partnerId)
        {
            var assignments = _context.PartnerAssignments
                .Where(pa => pa.PartnerId == partnerId)
                .ToList();

            return Ok(assignments);
        }

        [HttpGet("BySafehouse/{safehouseId}")]
        public IActionResult GetBySafehouse(int safehouseId)
        {
            var assignments = _context.PartnerAssignments
                .Where(pa => pa.SafehouseId == safehouseId)
                .ToList();

            return Ok(assignments);
        }

        [HttpGet("GetAssignment/{assignmentId}")]
        public IActionResult GetAssignment(int assignmentId)
        {
            var assignment = _context.PartnerAssignments.Find(assignmentId);

            if (assignment == null)
            {
                return NotFound(new { message = "Partner assignment not found" });
            }

            return Ok(assignment);
        }

        [HttpPost("AddAssignment")]
        public IActionResult AddAssignment([FromBody] PartnerAssignment newAssignment)
        {
            _context.PartnerAssignments.Add(newAssignment);
            _context.SaveChanges();
            return Ok(newAssignment);
        }

        [HttpPut("UpdateAssignment/{assignmentId}")]
        public IActionResult UpdateAssignment(int assignmentId, [FromBody] PartnerAssignment updatedAssignment)
        {
            var existing = _context.PartnerAssignments.Find(assignmentId);

            if (existing == null)
            {
                return NotFound(new { message = "Partner assignment not found" });
            }

            existing.PartnerId = updatedAssignment.PartnerId;
            existing.SafehouseId = updatedAssignment.SafehouseId;
            existing.ProgramArea = updatedAssignment.ProgramArea;
            existing.AssignmentStart = updatedAssignment.AssignmentStart;
            existing.AssignmentEnd = updatedAssignment.AssignmentEnd;
            existing.ResponsibilityNotes = updatedAssignment.ResponsibilityNotes;
            existing.IsPrimary = updatedAssignment.IsPrimary;
            existing.Status = updatedAssignment.Status;

            _context.PartnerAssignments.Update(existing);
            _context.SaveChanges();

            return Ok(existing);
        }
    }
}
