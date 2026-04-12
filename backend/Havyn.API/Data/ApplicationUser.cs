using Microsoft.AspNetCore.Identity;

namespace Havyn.Data
{
    public class ApplicationUser : IdentityUser
    {
        // Domain links
        public int? SafehouseId { get; set; }
        public string? SocialWorkerCode { get; set; }
        public int? SupporterId { get; set; }

        // Extra columns already on the table
        public string DisplayName { get; set; } = "";
        public bool PrivacyPolicyAccepted { get; set; } = false;
        public bool CookieConsentAccepted { get; set; } = false;
        public DateTime? PrivacyPolicyAcceptedAtUtc { get; set; }
        public DateTime? CookieConsentAcceptedAtUtc { get; set; }
    }
}