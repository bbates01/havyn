using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mission11_Bates.Data;

namespace Mission11_Bates.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly HavynDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public ReportsController(HavynDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // ── Reports (Admin TAB 5) ──

        [HttpGet("ResidentOutcomes")]
        [Authorize(Policy = "InternalStaff")]
        public IActionResult GetResidentOutcomes(string? startDate = null, string? endDate = null, string format = "json")
        {
            var residentsQuery = _context.Residents.Where(r => r.CaseStatus == "Active").AsQueryable();

            var riskDistribution = residentsQuery
                .GroupBy(r => r.CurrentRiskLevel)
                .Select(g => new { RiskLevel = g.Key, Count = g.Count() })
                .ToList();

            var avgEducationProgress = _context.EducationRecords
                .Average(er => (float?)er.ProgressPercent) ?? 0;

            var avgHealthScore = _context.HealthWellbeingRecords
                .Average(hr => (float?)hr.GeneralHealthScore) ?? 0;

            var reintegrationSummary = _context.Residents
                .Where(r => r.ReintegrationStatus == "Completed")
                .GroupBy(r => r.ReintegrationType)
                .Select(g => new { ReintegrationType = g.Key, Count = g.Count() })
                .ToList();

            var totalActive = residentsQuery.Count();

            var result = new
            {
                TotalActiveResidents = totalActive,
                RiskDistribution = riskDistribution,
                AvgEducationProgress = Math.Round(avgEducationProgress, 2),
                AvgHealthScore = Math.Round(avgHealthScore, 2),
                ReintegrationSummary = reintegrationSummary
            };

            if (format == "csv")
            {
                var csv = new StringBuilder();
                csv.AppendLine("RiskLevel,Count");
                foreach (var r in riskDistribution)
                    csv.AppendLine($"{r.RiskLevel},{r.Count}");
                return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "resident_outcomes.csv");
            }

            return Ok(result);
        }

        [HttpGet("ServicesProvided")]
        [Authorize(Policy = "InternalStaff")]
        public IActionResult GetServicesProvided(string? startDate = null, string? endDate = null, string format = "json")
        {
            var caringCount = _context.HomeVisitations.Count();
            var healingCount = _context.ProcessRecordings.Count();
            var teachingCount = _context.EducationRecords.Count();
            var legalReferrals = _context.ProcessRecordings.Count(pr => pr.ReferralMade);
            var legalPlans = _context.InterventionPlans.Count(ip => ip.PlanCategory == "Legal");

            var result = new
            {
                Caring = caringCount,
                Healing = healingCount,
                Teaching = teachingCount,
                LegalReferrals = legalReferrals,
                LegalPlans = legalPlans
            };

            if (format == "csv")
            {
                var csv = new StringBuilder();
                csv.AppendLine("ServiceCategory,Count");
                csv.AppendLine($"Caring,{caringCount}");
                csv.AppendLine($"Healing,{healingCount}");
                csv.AppendLine($"Teaching,{teachingCount}");
                csv.AppendLine($"LegalReferrals,{legalReferrals}");
                csv.AppendLine($"LegalPlans,{legalPlans}");
                return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "services_provided.csv");
            }

            return Ok(result);
        }

        [HttpGet("SafehouseComparison")]
        [Authorize(Policy = "InternalStaff")]
        public IActionResult GetSafehouseComparison(string format = "json")
        {
            var metrics = _context.SafehouseMonthlyMetrics.ToList();

            var comparison = metrics
                .GroupBy(m => m.SafehouseId)
                .Select(g => new
                {
                    SafehouseId = g.Key,
                    AvgActiveResidents = Math.Round(g.Average(m => m.ActiveResidents), 1),
                    AvgEducationProgress = Math.Round(g.Average(m => (double)(m.AvgEducationProgress ?? 0)), 2),
                    AvgHealthScore = Math.Round(g.Average(m => (double)(m.AvgHealthScore ?? 0)), 2),
                    TotalIncidents = g.Sum(m => m.IncidentCount),
                    TotalProcessRecordings = g.Sum(m => m.ProcessRecordingCount),
                    TotalHomeVisitations = g.Sum(m => m.HomeVisitationCount)
                })
                .ToList();

            if (format == "csv")
            {
                var csv = new StringBuilder();
                csv.AppendLine("SafehouseId,AvgActiveResidents,AvgEducationProgress,AvgHealthScore,TotalIncidents,TotalProcessRecordings,TotalHomeVisitations");
                foreach (var c in comparison)
                    csv.AppendLine($"{c.SafehouseId},{c.AvgActiveResidents},{c.AvgEducationProgress},{c.AvgHealthScore},{c.TotalIncidents},{c.TotalProcessRecordings},{c.TotalHomeVisitations}");
                return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "safehouse_comparison.csv");
            }

            return Ok(comparison);
        }

        [HttpGet("DonationTrends")]
        [Authorize(Policy = "InternalStaff")]
        public IActionResult GetDonationTrends(string format = "json")
        {
            var donations = _context.Donations.ToList();

            var monthlyTotals = donations
                .GroupBy(d => d.DonationDate.ToString("yyyy-MM"))
                .Select(g => new
                {
                    Month = g.Key,
                    TotalAmount = g.Sum(d => (double)(d.Amount ?? d.EstimatedValue)),
                    Count = g.Count()
                })
                .OrderBy(m => m.Month)
                .ToList();

            var byCampaign = donations
                .Where(d => d.CampaignName != null)
                .GroupBy(d => d.CampaignName)
                .Select(g => new
                {
                    Campaign = g.Key,
                    TotalValue = g.Sum(d => (double)(d.Amount ?? d.EstimatedValue)),
                    Count = g.Count()
                })
                .ToList();

            var totalDonors = donations.Select(d => d.SupporterId).Distinct().Count();
            var recurringDonors = donations.Where(d => d.IsRecurring).Select(d => d.SupporterId).Distinct().Count();

            var result = new
            {
                MonthlyTotals = monthlyTotals,
                ByCampaign = byCampaign,
                TotalDonors = totalDonors,
                RecurringDonors = recurringDonors,
                OneTimeDonors = totalDonors - recurringDonors
            };

            if (format == "csv")
            {
                var csv = new StringBuilder();
                csv.AppendLine("Month,TotalAmount,Count");
                foreach (var m in monthlyTotals)
                    csv.AppendLine($"{m.Month},{m.TotalAmount},{m.Count}");
                return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "donation_trends.csv");
            }

            return Ok(result);
        }

        // ── Dashboard Summaries ──

        [HttpGet("AdminDashboardSummary")]
        [Authorize(Policy = "InternalStaff")]
        public IActionResult GetAdminDashboardSummary()
        {
            var totalActiveResidents = _context.Residents.Count(r => r.CaseStatus == "Active");
            var totalSupporters = _context.Supporters.Count(s => s.Status == "Active");
            var totalDonations = _context.Donations.Count();
            var upcomingEventsCount = _context.Events.Count(e => e.Status == "Scheduled");
            var unresolvedHighSeverity = _context.IncidentReports.Count(ir => ir.Severity == "High" && !ir.Resolved);

            return Ok(new
            {
                TotalActiveResidents = totalActiveResidents,
                TotalSupporters = totalSupporters,
                TotalDonations = totalDonations,
                UpcomingEventsCount = upcomingEventsCount,
                UnresolvedHighSeverityIncidents = unresolvedHighSeverity
            });
        }

        [HttpGet("ManagerDashboardSummary")]
        [Authorize(Policy = "InternalStaff")]
        public IActionResult GetManagerDashboardSummary(int safehouseId)
        {
            var activeResidents = _context.Residents.Count(r => r.SafehouseId == safehouseId && r.CaseStatus == "Active");
            var upcomingEvents = _context.Events.Count(e => e.Status == "Scheduled" && (e.SafehouseId == safehouseId || e.SafehouseId == null));
            var unresolvedHighSeverity = _context.IncidentReports.Count(ir => ir.SafehouseId == safehouseId && ir.Severity == "High" && !ir.Resolved);

            return Ok(new
            {
                ActiveResidents = activeResidents,
                UpcomingEventsCount = upcomingEvents,
                UnresolvedHighSeverityIncidents = unresolvedHighSeverity
            });
        }

        [HttpGet("StaffDashboardSummary")]
        [Authorize(Policy = "InternalStaff")]
        public IActionResult GetStaffDashboardSummary(string staffUserId)
        {
            var assignedCaseload = _context.Residents.Count(r => r.AssignedSocialWorker == staffUserId && r.CaseStatus == "Active");
            var upcomingAppointments = _context.Appointments.Count(a => a.StaffUserId == staffUserId && a.Status == "Scheduled");

            return Ok(new
            {
                AssignedCaseloadCount = assignedCaseload,
                UpcomingAppointmentsCount = upcomingAppointments
            });
        }

        [HttpGet("DonorDashboardSummary")]
        [Authorize(Policy = "DonorAccess")]
        public async Task<IActionResult> GetDonorDashboardSummary()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user?.SupporterId is not int supporterId)
                return StatusCode(403, new { message = "Your account is not linked to a supporter profile." });

            var donations = await _context.Donations.Where(d => d.SupporterId == supporterId).ToListAsync();
            var totalLifetimeDonations = donations.Sum(d => (double)(d.Amount ?? d.EstimatedValue));
            var donationCount = donations.Count;
            var activeRecurringCount = donations.Count(d => d.IsRecurring);

            var donationIds = donations.Select(d => d.DonationId).ToList();
            var allocationCount = donationIds.Count == 0
                ? 0
                : await _context.DonationAllocations.CountAsync(a => donationIds.Contains(a.DonationId));

            var impactSummary = allocationCount > 0
                ? $"Your gifts are allocated across {allocationCount} program line(s) at our safehouses — thank you."
                : "Thank you — your support helps girls in our safe homes.";

            return Ok(new
            {
                TotalLifetimeDonations = Math.Round(totalLifetimeDonations, 2),
                DonationCount = donationCount,
                ActiveRecurringCount = activeRecurringCount,
                ProgramAllocationsCount = allocationCount,
                ImpactSummary = impactSummary
            });
        }

        // ── Public ──

        [HttpGet("PublicImpact")]
        [AllowAnonymous]
        public IActionResult GetPublicImpact()
        {
            var snapshots = _context.PublicImpactSnapshots
                .Where(s => s.IsPublished)
                .OrderByDescending(s => s.SnapshotDate)
                .ToList();

            return Ok(snapshots);
        }
    }
}
