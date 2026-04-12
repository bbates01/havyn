using System.ComponentModel.DataAnnotations;

namespace Havyn.Data
{
    public class SocialMediaPost
    {
        [Key]
        public int PostId { get; set; }
        [Required]
        public string Platform { get; set; }
        [Required]
        public string PlatformPostId { get; set; }
        [Required]
        public string PostUrl { get; set; }
        [Required]
        public DateTime CreatedAt { get; set; }
        [Required]
        public string DayOfWeek { get; set; }
        [Required]
        public int PostHour { get; set; }
        [Required]
        public string PostType { get; set; }
        [Required]
        public string MediaType { get; set; }
        [Required]
        public string Caption { get; set; }
        public string? Hashtags { get; set; }
        [Required]
        public int NumHashtags { get; set; }
        [Required]
        public int MentionsCount { get; set; }
        [Required]
        public bool HasCallToAction { get; set; }
        public string? CallToActionType { get; set; }
        [Required]
        public string ContentTopic { get; set; }
        [Required]
        public string SentimentTone { get; set; }
        [Required]
        public int CaptionLength { get; set; }
        [Required]
        public bool FeaturesResidentStory { get; set; }
        public string? CampaignName { get; set; }
        [Required]
        public bool IsBoosted { get; set; }
        public float? BoostBudgetPhp { get; set; }
        [Required]
        public int Impressions { get; set; }
        [Required]
        public int Reach { get; set; }
        [Required]
        public int Likes { get; set; }
        [Required]
        public int Comments { get; set; }
        [Required]
        public int Shares { get; set; }
        [Required]
        public int Saves { get; set; }
        [Required]
        public int ClickThroughs { get; set; }
        public int? VideoViews { get; set; }
        [Required]
        public float EngagementRate { get; set; }
        [Required]
        public int ProfileVisits { get; set; }
        [Required]
        public int DonationReferrals { get; set; }
        [Required]
        public float EstimatedDonationValuePhp { get; set; }
        [Required]
        public int FollowerCountAtPost { get; set; }
        public float? WatchTimeSeconds { get; set; }
        public float? AvgViewDurationSeconds { get; set; }
        public int? SubscriberCountAtPost { get; set; }
        public float? Forwards { get; set; }
    }
}
