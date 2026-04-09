using Microsoft.EntityFrameworkCore;

namespace Mission11_Bates.Data
{
    public class HavynDbContext : DbContext
    {
        public HavynDbContext(DbContextOptions<HavynDbContext> options) : base(options)
        {
        }

        public DbSet<Resident> Residents { get; set; }
        public DbSet<Supporter> Supporters { get; set; }
        public DbSet<SocialMediaPost> SocialMediaPosts { get; set; }
        public DbSet<Safehouse> Safehouses { get; set; }
        public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics { get; set; }
        public DbSet<PublicImpactSnapshot> PublicImpactSnapshots { get; set; }
        public DbSet<ProcessRecording> ProcessRecordings { get; set; }
        public DbSet<Partner> Partners { get; set; }
        public DbSet<PartnerAssignment> PartnerAssignments { get; set; }
        public DbSet<InterventionPlan> InterventionPlans { get; set; }
        public DbSet<IncidentReport> IncidentReports { get; set; }
        public DbSet<InKindDonationItem> InKindDonationItems { get; set; }
        public DbSet<HomeVisitation> HomeVisitations { get; set; }
        public DbSet<HealthWellbeingRecord> HealthWellbeingRecords { get; set; }
        public DbSet<EducationRecord> EducationRecords { get; set; }
        public DbSet<Donation> Donations { get; set; }
        public DbSet<DonationAllocation> DonationAllocations { get; set; }
        public DbSet<Appointment> Appointments { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<TodoItem> TodoItems { get; set; }
        public DbSet<ResidentPrediction> ResidentPredictions { get; set; }
    }
}
