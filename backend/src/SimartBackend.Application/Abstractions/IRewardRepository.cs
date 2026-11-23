using SimartBackend.Domain.Entities.Economy;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where the reward catalog ("Mükafat Mağazası") and a child's
/// redemptions against it are read and written. Implemented in Infrastructure
/// against SimartDbContext — Application only ever sees this interface, same
/// pattern as IHabitCatalogRepository.</summary>
public interface IRewardRepository
{
    /// <summary>The catalog (never soft-deleted — the global query filter
    /// handles that). The original four rewards are seeded once at
    /// startup; a reward can also now come from a partner's own proposal
    /// going live (see AdminAcceptRewardProposalCommand/
    /// PartnerApproveRewardProposalCommand) — AddRewardAsync below is that
    /// write path, the first thing to ever add to this catalog outside the
    /// startup seed.</summary>
    Task<IReadOnlyList<Reward>> GetAllRewardsAsync(CancellationToken cancellationToken);

    Task<Reward?> FindRewardAsync(Guid rewardId, CancellationToken cancellationToken);

    Task AddRewardAsync(Reward reward, CancellationToken cancellationToken);

    Task AddRedemptionAsync(RewardRedemption redemption, CancellationToken cancellationToken);

    /// <summary>With `Reward` and `Child` both loaded — Approve/Reject need the
    /// reward's CostXp (to refund on rejection) and both names for the
    /// returned DTO, without extra round trips.</summary>
    Task<RewardRedemption?> FindRedemptionWithRewardAsync(Guid redemptionId, CancellationToken cancellationToken);

    Task UpdateRedemptionAsync(RewardRedemption redemption, CancellationToken cancellationToken);

    /// <summary>This child's most recent redemption per reward, keyed by
    /// RewardId — "most recent" (not "any") because a rejected redemption
    /// frees that reward up for a fresh attempt; only the latest attempt's
    /// status should gate a new one. Loaded in full and grouped in memory —
    /// one child's redemption history is small enough that this is simpler
    /// than asking the database to do it, same reasoning as
    /// IHabitCatalogRepository.GetCompletionDatesAsync.</summary>
    Task<IReadOnlyDictionary<Guid, RewardRedemption>> GetLatestRedemptionsByRewardAsync(
        Guid childId, CancellationToken cancellationToken);

    /// <summary>Every still-pending redemption across the given children, with
    /// `Reward` and `Child` both loaded — GetPendingRedemptionsQuery's read for
    /// the parent-facing approval list in Settings, keyed by family (via its
    /// children) rather than a single child.</summary>
    Task<IReadOnlyList<RewardRedemption>> GetPendingRedemptionsForChildrenAsync(
        IReadOnlyList<Guid> childIds, CancellationToken cancellationToken);
}
