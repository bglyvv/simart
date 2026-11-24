namespace SimartBackend.Application.Social;

/// <summary>The two values SocialPost.ApprovalStatus ever holds. A plain
/// string column (not an enum/lookup table) — same convention
/// RewardRedemption.Status already uses in this codebase.</summary>
public static class SocialApprovalStatus
{
    public const string Pending = "pending";
    public const string Approved = "approved";
}
