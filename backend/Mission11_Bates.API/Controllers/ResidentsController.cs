using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "CaseAccess")]
    public class ResidentsController : ControllerBase
    {
        private readonly HavynDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public ResidentsController(HavynDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet("AllResidents")]
        public IActionResult GetAllResidents(
            int pageSize = 25,
            int pageIndex = 1,
            string sortBy = "InternalCode",
            string sortOrder = "asc",
            [FromQuery] List<string>? caseStatuses = null,
            [FromQuery] List<string>? riskLevels = null,
            int? safehouseId = null,
            string? assignedSocialWorker = null)
        {
            var query = _context.Residents.AsQueryable();

            if (caseStatuses != null && caseStatuses.Any())
            {
                query = query.Where(r => caseStatuses.Contains(r.CaseStatus));
            }

            if (riskLevels != null && riskLevels.Any())
            {
                query = query.Where(r => riskLevels.Contains(r.CurrentRiskLevel));
            }

            if (safehouseId.HasValue)
            {
                query = query.Where(r => r.SafehouseId == safehouseId.Value);
            }

            if (!string.IsNullOrEmpty(assignedSocialWorker))
            {
                query = query.Where(r => r.AssignedSocialWorker == assignedSocialWorker);
            }

            query = sortBy switch
            {
                "InternalCode" => sortOrder == "desc" ? query.OrderByDescending(r => r.InternalCode) : query.OrderBy(r => r.InternalCode),
                "CaseCategory" => sortOrder == "desc" ? query.OrderByDescending(r => r.CaseCategory) : query.OrderBy(r => r.CaseCategory),
                "CurrentRiskLevel" => sortOrder == "desc" ? query.OrderByDescending(r => r.CurrentRiskLevel) : query.OrderBy(r => r.CurrentRiskLevel),
                "DateOfAdmission" => sortOrder == "desc" ? query.OrderByDescending(r => r.DateOfAdmission) : query.OrderBy(r => r.DateOfAdmission),
                "SafehouseId" => sortOrder == "desc" ? query.OrderByDescending(r => r.SafehouseId) : query.OrderBy(r => r.SafehouseId),
                _ => sortOrder == "desc" ? query.OrderByDescending(r => r.InternalCode) : query.OrderBy(r => r.InternalCode)
            };

            var totalCount = query.Count();

            var items = query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new { Items = items, TotalCount = totalCount });
        }

        [HttpGet("SocialWorkers")]
        [Authorize(Policy = "StaffManagement")]
        public async Task<IActionResult> GetSocialWorkers()
        {
            var workers = await _userManager.Users
                .Where(u => u.SocialWorkerCode != null)
                .Select(u => new { workerCode = u.SocialWorkerCode, displayName = u.DisplayName })
                .OrderBy(w => w.workerCode)
                .ToListAsync();

            return Ok(workers);
        }

        [HttpGet("GetResident/{residentId}")]
        public IActionResult GetResident(int residentId)
        {
            var resident = _context.Residents.Find(residentId);

            if (resident == null)
            {
                return NotFound(new { message = "Resident not found" });
            }

            return Ok(resident);
        }

        [HttpPost("AddResident")]
        [Authorize(Policy = "StaffManagement")]
        public async Task<IActionResult> AddResident([FromBody] Resident newResident)
        {
            var caller = await _userManager.GetUserAsync(User);
            if (caller == null) return Unauthorized();

            var roles = await _userManager.GetRolesAsync(caller);
            if (roles.Contains("Manager"))
            {
                if (caller.SafehouseId == null)
                    return StatusCode(403, new { message = "Your account is not assigned to a safehouse." });
                newResident.SafehouseId = caller.SafehouseId.Value;
            }

            // DB may not use IDENTITY on ResidentId (pre-provisioned schema). EF would omit PK=0 and Postgres inserts NULL.
            newResident.ResidentId = await _context.Residents.AnyAsync()
                ? await _context.Residents.MaxAsync(r => r.ResidentId) + 1
                : 1;

            newResident.CreatedAt = DateTime.UtcNow;
            _context.Residents.Add(newResident);
            await _context.SaveChangesAsync();
            return Ok(newResident);
        }

        [HttpPut("UpdateResident/{residentId}")]
        [Authorize(Policy = "StaffManagement")]
        public async Task<IActionResult> UpdateResident(int residentId, [FromBody] Resident updatedResident)
        {
            var caller = await _userManager.GetUserAsync(User);
            if (caller == null) return Unauthorized();

            var existing = await _context.Residents.FindAsync(residentId);
            if (existing == null)
                return NotFound(new { message = "Resident not found" });

            var roles = await _userManager.GetRolesAsync(caller);
            if (roles.Contains("Manager"))
            {
                if (caller.SafehouseId == null)
                    return StatusCode(403, new { message = "Your account is not assigned to a safehouse." });
                if (existing.SafehouseId != caller.SafehouseId)
                    return StatusCode(403, new { message = "You can only edit residents in your own safehouse." });
                updatedResident.SafehouseId = caller.SafehouseId.Value;
            }

            existing.CaseControlNo = updatedResident.CaseControlNo;
            existing.InternalCode = updatedResident.InternalCode;
            existing.SafehouseId = updatedResident.SafehouseId;
            existing.CaseStatus = updatedResident.CaseStatus;
            existing.Sex = updatedResident.Sex;
            existing.DateOfBirth = updatedResident.DateOfBirth;
            existing.BirthStatus = updatedResident.BirthStatus;
            existing.PlaceOfBirth = updatedResident.PlaceOfBirth;
            existing.Religion = updatedResident.Religion;
            existing.CaseCategory = updatedResident.CaseCategory;
            existing.SubCatOrphaned = updatedResident.SubCatOrphaned;
            existing.SubCatTrafficked = updatedResident.SubCatTrafficked;
            existing.SubCatChildLabor = updatedResident.SubCatChildLabor;
            existing.SubCatPhysicalAbuse = updatedResident.SubCatPhysicalAbuse;
            existing.SubCatSexualAbuse = updatedResident.SubCatSexualAbuse;
            existing.SubCatOsaec = updatedResident.SubCatOsaec;
            existing.SubCatCicl = updatedResident.SubCatCicl;
            existing.SubCatAtRisk = updatedResident.SubCatAtRisk;
            existing.SubCatStreetChild = updatedResident.SubCatStreetChild;
            existing.SubCatChildWithHiv = updatedResident.SubCatChildWithHiv;
            existing.IsPwd = updatedResident.IsPwd;
            existing.PwdType = updatedResident.PwdType;
            existing.HasSpecialNeeds = updatedResident.HasSpecialNeeds;
            existing.SpecialNeedsDiagnosis = updatedResident.SpecialNeedsDiagnosis;
            existing.FamilyIs4ps = updatedResident.FamilyIs4ps;
            existing.FamilySoloParent = updatedResident.FamilySoloParent;
            existing.FamilyIndigenous = updatedResident.FamilyIndigenous;
            existing.FamilyParentPwd = updatedResident.FamilyParentPwd;
            existing.FamilyInformalSettler = updatedResident.FamilyInformalSettler;
            existing.DateOfAdmission = updatedResident.DateOfAdmission;
            existing.AgeUponAdmission = updatedResident.AgeUponAdmission;
            existing.PresentAge = updatedResident.PresentAge;
            existing.LengthOfStay = updatedResident.LengthOfStay;
            existing.ReferralSource = updatedResident.ReferralSource;
            existing.ReferringAgencyPerson = updatedResident.ReferringAgencyPerson;
            existing.DateColbRegistered = updatedResident.DateColbRegistered;
            existing.DateColbObtained = updatedResident.DateColbObtained;
            existing.AssignedSocialWorker = updatedResident.AssignedSocialWorker;
            existing.InitialCaseAssessment = updatedResident.InitialCaseAssessment;
            existing.DateCaseStudyPrepared = updatedResident.DateCaseStudyPrepared;
            existing.ReintegrationType = updatedResident.ReintegrationType;
            existing.ReintegrationStatus = updatedResident.ReintegrationStatus;
            existing.InitialRiskLevel = updatedResident.InitialRiskLevel;
            existing.CurrentRiskLevel = updatedResident.CurrentRiskLevel;
            existing.DateEnrolled = updatedResident.DateEnrolled;
            existing.DateClosed = updatedResident.DateClosed;
            existing.NotesRestricted = updatedResident.NotesRestricted;

            _context.Residents.Update(existing);
            await _context.SaveChangesAsync();

            return Ok(existing);
        }
    }
}
