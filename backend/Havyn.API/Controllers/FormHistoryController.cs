using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Havyn.Data;
using Havyn.Services;

namespace Havyn.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Policy = "CaseAccess")]
public class FormHistoryController : ControllerBase
{
    private readonly HavynDbContext _context;
    private readonly IResidentAccessService _residentAccess;

    public FormHistoryController(HavynDbContext context, IResidentAccessService residentAccess)
    {
        _context = context;
        _residentAccess = residentAccess;
    }

    public sealed class FormHistoryItemDto
    {
        public string FormType { get; set; } = string.Empty;
        public int RecordId { get; set; }
        public int ResidentId { get; set; }
        public string ResidentInternalCode { get; set; } = string.Empty;
        public int SafehouseId { get; set; }
        public DateOnly EventDate { get; set; }
        public string? SubmittedBy { get; set; }
        public string Summary { get; set; } = string.Empty;
    }

    [HttpGet]
    public async Task<IActionResult> GetFormHistory(
        int pageSize = 25,
        int pageIndex = 1,
        string sortOrder = "desc",
        int? residentId = null)
    {
        if (pageSize <= 0) pageSize = 25;
        if (pageIndex <= 0) pageIndex = 1;

        var scope = await _residentAccess.GetScopeAsync(User);
        if (!_residentAccess.ScopeAllowsCaseAccess(scope))
            return StatusCode(403, new { message = "Account is not configured for case access." });

        var residents = await _residentAccess
            .ApplyToResidents(_context.Residents.AsNoTracking(), scope)
            .Where(r => !residentId.HasValue || r.ResidentId == residentId.Value)
            .Select(r => new
            {
                r.ResidentId,
                r.InternalCode,
                r.SafehouseId,
                r.AssignedSocialWorker
            })
            .ToListAsync();

        if (residents.Count == 0)
            return Ok(new { Items = Array.Empty<FormHistoryItemDto>(), TotalCount = 0 });

        var residentsById = residents.ToDictionary(r => r.ResidentId);
        var residentIds = residentsById.Keys.ToList();
        var items = new List<FormHistoryItemDto>(capacity: 256);

        var recordings = await _context.ProcessRecordings.AsNoTracking()
            .Where(pr => residentIds.Contains(pr.ResidentId))
            .Select(pr => new
            {
                pr.RecordingId,
                pr.ResidentId,
                pr.SessionDate,
                pr.SocialWorker,
                pr.SessionType
            })
            .ToListAsync();
        items.AddRange(recordings.Select(pr =>
        {
            var resident = residentsById[pr.ResidentId];
            return new FormHistoryItemDto
            {
                FormType = "process-recording",
                RecordId = pr.RecordingId,
                ResidentId = pr.ResidentId,
                ResidentInternalCode = resident.InternalCode,
                SafehouseId = resident.SafehouseId,
                EventDate = pr.SessionDate,
                SubmittedBy = pr.SocialWorker,
                Summary = $"Session {pr.SessionType}"
            };
        }));

        var visitations = await _context.HomeVisitations.AsNoTracking()
            .Where(hv => residentIds.Contains(hv.ResidentId))
            .Select(hv => new
            {
                hv.VisitationId,
                hv.ResidentId,
                hv.VisitDate,
                hv.SocialWorker,
                hv.VisitType
            })
            .ToListAsync();
        items.AddRange(visitations.Select(hv =>
        {
            var resident = residentsById[hv.ResidentId];
            return new FormHistoryItemDto
            {
                FormType = "home-visitation",
                RecordId = hv.VisitationId,
                ResidentId = hv.ResidentId,
                ResidentInternalCode = resident.InternalCode,
                SafehouseId = resident.SafehouseId,
                EventDate = hv.VisitDate,
                SubmittedBy = hv.SocialWorker,
                Summary = $"Visit {hv.VisitType}"
            };
        }));

        var plans = await _context.InterventionPlans.AsNoTracking()
            .Where(ip => residentIds.Contains(ip.ResidentId))
            .Select(ip => new
            {
                ip.PlanId,
                ip.ResidentId,
                ip.TargetDate,
                ip.PlanCategory,
                ip.Status
            })
            .ToListAsync();
        items.AddRange(plans.Select(ip =>
        {
            var resident = residentsById[ip.ResidentId];
            return new FormHistoryItemDto
            {
                FormType = "intervention-plan",
                RecordId = ip.PlanId,
                ResidentId = ip.ResidentId,
                ResidentInternalCode = resident.InternalCode,
                SafehouseId = resident.SafehouseId,
                EventDate = ip.TargetDate,
                SubmittedBy = resident.AssignedSocialWorker,
                Summary = $"Plan {ip.PlanCategory} ({ip.Status})"
            };
        }));

        var incidents = await _context.IncidentReports.AsNoTracking()
            .Where(ir => residentIds.Contains(ir.ResidentId))
            .Select(ir => new
            {
                ir.IncidentId,
                ir.ResidentId,
                ir.IncidentDate,
                ir.ReportedBy,
                ir.IncidentType,
                ir.Severity
            })
            .ToListAsync();
        items.AddRange(incidents.Select(ir =>
        {
            var resident = residentsById[ir.ResidentId];
            return new FormHistoryItemDto
            {
                FormType = "incident-report",
                RecordId = ir.IncidentId,
                ResidentId = ir.ResidentId,
                ResidentInternalCode = resident.InternalCode,
                SafehouseId = resident.SafehouseId,
                EventDate = ir.IncidentDate,
                SubmittedBy = ir.ReportedBy,
                Summary = $"Incident {ir.IncidentType} ({ir.Severity})"
            };
        }));

        var healthRecords = await _context.HealthWellbeingRecords.AsNoTracking()
            .Where(hr => residentIds.Contains(hr.ResidentId))
            .Select(hr => new
            {
                hr.HealthRecordId,
                hr.ResidentId,
                hr.RecordDate
            })
            .ToListAsync();
        items.AddRange(healthRecords.Select(hr =>
        {
            var resident = residentsById[hr.ResidentId];
            return new FormHistoryItemDto
            {
                FormType = "health-wellbeing",
                RecordId = hr.HealthRecordId,
                ResidentId = hr.ResidentId,
                ResidentInternalCode = resident.InternalCode,
                SafehouseId = resident.SafehouseId,
                EventDate = hr.RecordDate,
                SubmittedBy = resident.AssignedSocialWorker,
                Summary = "Health record"
            };
        }));

        var educationRecords = await _context.EducationRecords.AsNoTracking()
            .Where(er => residentIds.Contains(er.ResidentId))
            .Select(er => new
            {
                er.EducationRecordId,
                er.ResidentId,
                er.RecordDate,
                er.EducationLevel,
                er.CompletionStatus
            })
            .ToListAsync();
        items.AddRange(educationRecords.Select(er =>
        {
            var resident = residentsById[er.ResidentId];
            return new FormHistoryItemDto
            {
                FormType = "education-record",
                RecordId = er.EducationRecordId,
                ResidentId = er.ResidentId,
                ResidentInternalCode = resident.InternalCode,
                SafehouseId = resident.SafehouseId,
                EventDate = er.RecordDate,
                SubmittedBy = resident.AssignedSocialWorker,
                Summary = $"Education {er.EducationLevel} ({er.CompletionStatus})"
            };
        }));

        var ordered = string.Equals(sortOrder, "asc", StringComparison.OrdinalIgnoreCase)
            ? items.OrderBy(x => x.EventDate).ThenBy(x => x.ResidentInternalCode).ThenBy(x => x.FormType)
            : items.OrderByDescending(x => x.EventDate).ThenBy(x => x.ResidentInternalCode).ThenBy(x => x.FormType);

        var totalCount = items.Count;
        var pagedItems = ordered
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new { Items = pagedItems, TotalCount = totalCount });
    }
}
