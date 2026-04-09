using Microsoft.AspNetCore.Mvc;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ResidentsController : ControllerBase
    {
        private HavynDbContext _context;

        public ResidentsController(HavynDbContext temp) => _context = temp;

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
        public IActionResult AddResident([FromBody] Resident newResident)
        {
            _context.Residents.Add(newResident);
            _context.SaveChanges();
            return Ok(newResident);
        }

        [HttpPut("UpdateResident/{residentId}")]
        public IActionResult UpdateResident(int residentId, [FromBody] Resident updatedResident)
        {
            var existing = _context.Residents.Find(residentId);

            if (existing == null)
            {
                return NotFound(new { message = "Resident not found" });
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
            _context.SaveChanges();

            return Ok(existing);
        }
    }
}
