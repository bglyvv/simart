namespace SimartBackend.Application.Partners;

/// <summary>The full set of states a RewardProposal can be in — see
/// RewardProposal's own doc comment for the full lifecycle narrative.</summary>
public static class RewardProposalStatus
{
    /// <summary>Just submitted by the partner, or sent back after the
    /// partner rejected an admin edit — either way, waiting on the admin.</summary>
    public const string PendingAdminReview = "pending_admin_review";

    /// <summary>Admin changed the terms — waiting on the partner to approve
    /// or reject those changes.</summary>
    public const string AdminEditedPendingPartner = "admin_edited_pending_partner";

    /// <summary>The partner rejected the admin's edited terms — functions
    /// identically to PendingAdminReview (still needs an admin decision),
    /// kept as its own status purely so the admin dashboard can show "this
    /// was rejected once" rather than looking like a brand-new submission.</summary>
    public const string RejectedByPartner = "rejected_by_partner";

    /// <summary>Terminal: a real Reward row exists (PublishedRewardId is
    /// set) and it's live in the public catalog.</summary>
    public const string Approved = "approved";

    /// <summary>Terminal: the admin declined the proposal outright — no
    /// revision loop, unlike a partner's rejection of an edit.</summary>
    public const string DeclinedByAdmin = "declined_by_admin";
}
