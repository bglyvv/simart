using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Domain.Entities.Partners;

/// <summary>A real-world business that fulfills redemptions in person — the
/// bookstore, the ice cream shop, the park, the toy store (Reward's own
/// `Sponsor` text names these already), plus the two banks sponsoring a
/// DonationCampaign. Not a parent, not an admin: its own login, its own JWT
/// claim type (see JwtAuthTokenService.PartnerIdClaimType), scoped only to
/// the vouchers tied to its own Rewards/DonationCampaigns.</summary>
public class Partner
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>The QR-scannable receipt for one redemption or donation — created
/// the moment a reward is redeemed or a donation is made (see
/// RedeemRewardCommandHandler/DonateCommandHandler), *if* the underlying
/// Reward/DonationCampaign has a Partner attached. `Code` is what's actually
/// encoded in the QR image (rendered client-side); `SourceType`/`SourceId`
/// point back at the RewardRedemption or WalletTransaction row this voucher
/// is a receipt for — same correlation shape XpTransaction/WalletTransaction
/// already use elsewhere in this backend, not a new convention.
///
/// A reward-sourced voucher exists from the moment of redemption (status
/// "pending" until fulfilled) but FulfillVoucherCommandHandler additionally
/// checks the underlying RewardRedemption's own Status — a partner can't
/// fulfill a voucher for a redemption a parent hasn't approved yet (see that
/// handler's own doc comment). A donation-sourced voucher has no such extra
/// gate, since Donate itself is instant/always-confirmed.</summary>
public class Voucher
{
    public Guid Id { get; set; }
    public required string Code { get; set; }
    public Guid ChildId { get; set; }
    public Guid PartnerId { get; set; }
    public required string SourceType { get; set; }
    public Guid SourceId { get; set; }
    public required string Title { get; set; }
    public required string Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? FulfilledAt { get; set; }

    public Child Child { get; set; } = null!;
    public Partner Partner { get; set; } = null!;
}

/// <summary>A partner's own proposed addition to the reward catalog —
/// "partner can create something that can be redeemed using XP, admin
/// should accept it; admin can also edit it, which sends it back to the
/// partner's panel; once they approve it, it's public." A fresh proposal
/// starts "pending_admin_review"; admin can accept it as-is (goes straight
/// to "approved" and publishes immediately — the partner already proposed
/// these exact terms) or edit it (status becomes
/// "admin_edited_pending_partner", the edited terms wait in the partner's
/// own panel); the partner then approves (publishes) or rejects (back to
/// "rejected_by_partner", which the admin dashboard treats the same as a
/// fresh pending proposal needing another look — loops until the partner
/// accepts or the admin declines outright). `PublishedRewardId` is set the
/// moment a real `Reward` row is created for this proposal — see
/// RewardProposalStatus for the full set of status strings and
/// RewardProposalEvent for the audit trail of every step.</summary>
public class RewardProposal
{
    public Guid Id { get; set; }
    public Guid PartnerId { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int CostXp { get; set; }
    public required string Icon { get; set; }
    public required string Status { get; set; }
    public Guid? PublishedRewardId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Partner Partner { get; set; } = null!;
    public ICollection<RewardProposalEvent> Events { get; set; } = new List<RewardProposalEvent>();
}

/// <summary>One row per step in a RewardProposal's life — submitted, edited
/// by admin, approved/rejected by the partner, declined by admin, published
/// — the "history" the proposal flow needs, instead of only ever showing
/// the current status with every earlier step silently overwritten.</summary>
public class RewardProposalEvent
{
    public Guid Id { get; set; }
    public Guid ProposalId { get; set; }
    public required string EventType { get; set; }
    public required string ActorType { get; set; }
    public Guid ActorId { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset OccurredAt { get; set; }

    public RewardProposal Proposal { get; set; } = null!;
}
