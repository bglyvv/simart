namespace SimartBackend.Application.Partners;

/// <summary>Every event type that can appear in a RewardProposal's history
/// (RewardProposalDto.Events) — ActorType is always "partner" or "admin".</summary>
public static class RewardProposalEventType
{
    public const string Submitted = "submitted";
    public const string EditedByAdmin = "edited_by_admin";
    public const string AcceptedByAdmin = "accepted_by_admin";
    public const string DeclinedByAdmin = "declined_by_admin";
    public const string ApprovedByPartner = "approved_by_partner";
    public const string RejectedByPartner = "rejected_by_partner";
    public const string Published = "published";

    public const string ActorPartner = "partner";
    public const string ActorAdmin = "admin";
}
