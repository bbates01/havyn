using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Havyn.Data
{
    public class Resident
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int ResidentId { get; set; }
        [Required]
        public string CaseControlNo { get; set; }
        [Required]
        public string InternalCode { get; set; }
        [Required]
        public int SafehouseId { get; set; }
        [Required]
        public string CaseStatus { get; set; }
        [Required]
        public string Sex { get; set; }
        [Required]
        public DateOnly DateOfBirth { get; set; }
        [Required]
        public string BirthStatus { get; set; }
        [Required]
        public string PlaceOfBirth { get; set; }
        [Required]
        public string Religion { get; set; }
        [Required]
        public string CaseCategory { get; set; }
        [Required]
        public bool SubCatOrphaned { get; set; }
        [Required]
        public bool SubCatTrafficked { get; set; }
        [Required]
        public bool SubCatChildLabor { get; set; }
        [Required]
        public bool SubCatPhysicalAbuse { get; set; }
        [Required]
        public bool SubCatSexualAbuse { get; set; }
        [Required]
        public bool SubCatOsaec { get; set; }
        [Required]
        public bool SubCatCicl { get; set; }
        [Required]
        public bool SubCatAtRisk { get; set; }
        [Required]
        public bool SubCatStreetChild { get; set; }
        [Required]
        public bool SubCatChildWithHiv { get; set; }
        [Required]
        public bool IsPwd { get; set; }
        public string? PwdType { get; set; }
        [Required]
        public bool HasSpecialNeeds { get; set; }
        public string? SpecialNeedsDiagnosis { get; set; }
        [Required]
        public bool FamilyIs4ps { get; set; }
        [Required]
        public bool FamilySoloParent { get; set; }
        [Required]
        public bool FamilyIndigenous { get; set; }
        [Required]
        public bool FamilyParentPwd { get; set; }
        [Required]
        public bool FamilyInformalSettler { get; set; }
        [Required]
        public DateOnly DateOfAdmission { get; set; }
        [Required]
        public string AgeUponAdmission { get; set; }
        [Required]
        public string PresentAge { get; set; }
        [Required]
        public string LengthOfStay { get; set; }
        public string? ReferralSource { get; set; }
        public string? ReferringAgencyPerson { get; set; }
        public DateOnly? DateColbRegistered { get; set; }
        public DateOnly? DateColbObtained { get; set; }
        public string? AssignedSocialWorker { get; set; }
        public string? InitialCaseAssessment { get; set; }
        public DateOnly? DateCaseStudyPrepared { get; set; }
        public string? ReintegrationType { get; set; }
        public string? ReintegrationStatus { get; set; }
        public string? InitialRiskLevel { get; set; }
        public string? CurrentRiskLevel { get; set; }
        public DateOnly? DateEnrolled { get; set; }
        public DateOnly? DateClosed { get; set; }
        public DateTime? CreatedAt { get; set; }
        public string? NotesRestricted { get; set; }
    }
}
