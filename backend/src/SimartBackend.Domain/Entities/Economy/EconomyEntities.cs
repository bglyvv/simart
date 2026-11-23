using SimartBackend.Domain.Common;
using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Domain.Entities.Economy;

/// <summary>The XP ledger — every gain or spend is one row, never a mutated counter.</summary>
public class XpTransaction
{
    public Guid Id { get; set; }
    public Guid ChildId { get; set; }
    public int Amount { get; set; }
    public required string Reason { get; set; }
    public required string SourceType { get; set; }
    public Guid SourceId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Child Child { get; set; } = null!;
}

/// <summary>League-shop catalog entry.</summary>
public class Reward : ISoftDeletable
{
    public Guid Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int CostXp { get; set; }
    public string? Sponsor { get; set; }
    public required string Icon { get; set; }
    /// <summary>The real-world business behind `Sponsor`'s text — null for a
    /// reward with no partner account yet, in which case RedeemRewardCommand
    /// never creates a Voucher for it (see that handler's own doc comment).</summary>
    public Guid? PartnerId { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
}

/// <summary>A parent-approved claim against the reward catalog.</summary>
public class RewardRedemption
{
    public Guid Id { get; set; }
    public Guid ChildId { get; set; }
    public Guid RewardId { get; set; }
    public Guid? ApprovedByParentId { get; set; }
    public required string Status { get; set; }
    public DateTimeOffset RedeemedAt { get; set; }

    public Child Child { get; set; } = null!;
    public Reward Reward { get; set; } = null!;
    public Parent? ApprovedByParent { get; set; }
}

/// <summary>Real AZN movements, kept separate from XP.</summary>
public class WalletTransaction
{
    public Guid Id { get; set; }
    public Guid ChildId { get; set; }
    public required string Title { get; set; }
    public required string Direction { get; set; }
    public decimal AmountAzn { get; set; }
    public required string SourceType { get; set; }
    public Guid SourceId { get; set; }
    public DateTimeOffset OccurredAt { get; set; }

    public Child Child { get; set; } = null!;
}

/// <summary>Catalog of sponsor-backed donation campaigns.</summary>
public class DonationCampaign : ISoftDeletable
{
    public Guid Id { get; set; }
    public required string Title { get; set; }
    public string? Sponsor { get; set; }
    public int XpCost { get; set; }
    public decimal AznAmount { get; set; }
    public required string Icon { get; set; }
    /// <summary>Same role as Reward.PartnerId — null means DonateCommand
    /// never creates a Voucher for this campaign.</summary>
    public Guid? PartnerId { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
}
