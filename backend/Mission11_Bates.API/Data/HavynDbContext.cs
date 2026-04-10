using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using System.Threading;
using System.Threading.Tasks;

namespace Mission11_Bates.Data
{
    public class HavynDbContext : IdentityDbContext<ApplicationUser>
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
        public DbSet<ResidentIncidentRisk> ResidentIncidentRisk { get; set; }
        public DbSet<MlModelMeta> MlModelMeta { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Supporter>()
                .HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            // DB table (CSV baseline) has no SERIAL/identity on DonationId; inserts must supply PK.
            modelBuilder.Entity<Donation>()
                .Property(d => d.DonationId)
                .ValueGeneratedNever();
        }

        public async Task<int> NextDonationIdAsync(CancellationToken cancellationToken = default)
        {
            if (!await Donations.AnyAsync(cancellationToken))
                return 1;
            return await Donations.MaxAsync(d => d.DonationId, cancellationToken) + 1;
        }
    }
}
