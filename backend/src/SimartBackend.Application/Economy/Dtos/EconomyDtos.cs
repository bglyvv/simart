using SimartBackend.Domain.Entities.Economy;

namespace SimartBackend.Application.Economy.Dtos;

/// <summary>RedemptionStatus is this child's most recent attempt at this
/// reward — null if never attempted, "pending"/"approved"/"rejected"
/// otherwise. A "rejected" status still lets the child try again (see
/// RewardAlreadyRedeemedException's doc comment); the frontend decides what
/// that means for the button, this DTO just reports the truth.</summary>
public sealed record RewardDto(
    Guid Id, string Title, string? Description, int CostXp, string? Sponsor, string Icon, string? RedemptionStatus)
{
    public static RewardDto FromDomain(Reward reward, string? redemptionStatus) => new(
        reward.Id, reward.Title, reward.Description, reward.CostXp, reward.Sponsor, reward.Icon, redemptionStatus);
}

/// <summary>VoucherCode is null unless this came straight back from
/// RedeemRewardCommand itself — the pending-list/approve/reject paths don't
/// need a parent to see the QR code, only the child who just redeemed does
/// (see RedeemRewardCommandHandler).</summary>
public sealed record RewardRedemptionDto(
    Guid Id, Guid ChildId, string ChildName, Guid RewardId, string RewardTitle, int CostXp, string Status,
    DateTimeOffset RedeemedAt, string? VoucherCode = null)
{
    public static RewardRedemptionDto FromDomain(RewardRedemption redemption) => new(
        redemption.Id, redemption.ChildId, redemption.Child?.Name ?? string.Empty,
        redemption.RewardId, redemption.Reward?.Title ?? string.Empty, redemption.Reward?.CostXp ?? 0,
        redemption.Status, redemption.RedeemedAt);
}

public sealed record DonationCampaignDto(Guid Id, string Title, string? Sponsor, int XpCost, decimal AznAmount, string Icon)
{
    public static DonationCampaignDto FromDomain(DonationCampaign campaign) => new(
        campaign.Id, campaign.Title, campaign.Sponsor, campaign.XpCost, campaign.AznAmount, campaign.Icon);
}

public sealed record WalletTransactionDto(Guid Id, string Title, string Direction, decimal AmountAzn, DateTimeOffset OccurredAt)
{
    public static WalletTransactionDto FromDomain(WalletTransaction transaction) => new(
        transaction.Id, transaction.Title, transaction.Direction, transaction.AmountAzn, transaction.OccurredAt);
}

/// <summary>DonateCommand's response — the campaign's own title/aznAmount
/// (not just an id) plus the child's new balance, so the frontend's toast and
/// balance hero can update from one round trip without a second GET.
/// VoucherCode is null when the campaign has no partner behind it yet.</summary>
public sealed record DonationResultDto(
    Guid TransactionId, string CampaignTitle, int XpCost, decimal AznAmount, decimal NewBalanceAzn, string? VoucherCode = null);

public sealed record WalletBalanceDto(decimal BalanceAzn);
