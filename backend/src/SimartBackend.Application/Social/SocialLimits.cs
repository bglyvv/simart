namespace SimartBackend.Application.Social;

/// <summary>Plain length caps — not real content moderation (see the "Social"
/// section in backend/README.md for what the on-page "AI Filter" badge
/// actually is: decorative, same as it was in the original mock — no
/// moderation service is called anywhere in this slice).</summary>
public static class SocialLimits
{
    public const int MaxCaptionLength = 280;
    public const int MaxCommentLength = 280;
}
