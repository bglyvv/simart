namespace SimartBackend.Application.Economy;

/// <summary>Thrown by the reward handlers when the given childId doesn't
/// exist — mapped to 404. Same split-purpose as HabitChildNotFoundException.</summary>
public sealed class RewardChildNotFoundException(Guid childId)
    : Exception($"Child '{childId}' was not found.");

/// <summary>Thrown by the reward handlers when the caller's token family
/// doesn't own the given child (or, for Approve/Reject, the child behind the
/// redemption) — mapped to 403.</summary>
public sealed class RewardAccessDeniedException()
    : Exception("This child does not belong to your family.");

/// <summary>Thrown by RedeemRewardCommandHandler when rewardId doesn't exist
/// — mapped to 404.</summary>
public sealed class RewardNotFoundException(Guid rewardId)
    : Exception($"Reward '{rewardId}' was not found.");

/// <summary>Thrown by RedeemRewardCommandHandler when the child's real XP
/// balance (IHabitCatalogRepository.GetTotalXpAsync) is below the reward's
/// CostXp — mapped to 400. The frontend already disables the button in this
/// case; this is the real, server-side enforcement behind it.</summary>
public sealed class InsufficientXpException(int costXp, int availableXp)
    : Exception($"This reward costs {costXp} XP; only {availableXp} is available.");

/// <summary>Thrown by RedeemRewardCommandHandler when the child's most recent
/// redemption of this exact reward is still "pending" or already "approved"
/// — mapped to 409. A "rejected" redemption does NOT throw this — rejection
/// frees the reward up for a fresh attempt (see
/// IRewardRepository.GetLatestRedemptionsByRewardAsync).</summary>
public sealed class RewardAlreadyRedeemedException(Guid rewardId)
    : Exception($"Reward '{rewardId}' has already been redeemed or is awaiting approval.");

/// <summary>Thrown by Approve/RejectRewardRedemptionCommandHandler when
/// redemptionId doesn't exist — mapped to 404.</summary>
public sealed class RedemptionNotFoundException(Guid redemptionId)
    : Exception($"Redemption '{redemptionId}' was not found.");

/// <summary>Thrown by Approve/RejectRewardRedemptionCommandHandler when the
/// redemption's Status isn't "pending" anymore — mapped to 409. A decision,
/// once made, can't be changed by calling the other endpoint afterward.</summary>
public sealed class RedemptionAlreadyResolvedException(Guid redemptionId)
    : Exception($"Redemption '{redemptionId}' has already been resolved.");

/// <summary>Thrown by the wallet handlers when the given childId doesn't
/// exist — mapped to 404. Same split-purpose as RewardChildNotFoundException:
/// a separate pair from Reward's own, named after Wallet specifically, same
/// "ContentChildNotFoundException alongside Content's admin-only exceptions"
/// precedent — same Economy namespace, a different sub-concept.</summary>
public sealed class WalletChildNotFoundException(Guid childId)
    : Exception($"Child '{childId}' was not found.");

/// <summary>Thrown by the wallet handlers when the caller's token family
/// doesn't own the given child — mapped to 403, same "can't write into
/// another family" rule as RewardAccessDeniedException.</summary>
public sealed class WalletAccessDeniedException()
    : Exception("This child does not belong to your family.");

/// <summary>Thrown by DonateCommandHandler when campaignId doesn't match any
/// (non-deleted) DonationCampaign — mapped to 404.</summary>
public sealed class DonationCampaignNotFoundException(Guid campaignId)
    : Exception($"Donation campaign '{campaignId}' was not found.");

/// <summary>Thrown by GrantAllowanceCommandHandler when AmountAzn falls
/// outside WalletLimits' sane range — mapped to 400. A parent is trusted with
/// their own child's pocket money, but not with sending an absurd or zero/
/// negative amount through a direct API call.</summary>
public sealed class InvalidAllowanceAmountException(decimal amountAzn)
    : Exception($"Amount {amountAzn} AZN is outside the allowed range " +
        $"({WalletLimits.MinGrantAzn}-{WalletLimits.MaxGrantAzn}).");
