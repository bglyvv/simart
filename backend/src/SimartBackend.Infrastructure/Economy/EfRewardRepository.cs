using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Economy;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure.Economy;

public sealed class EfRewardRepository(SimartDbContext db) : IRewardRepository
{
    public async Task<IReadOnlyList<Reward>> GetAllRewardsAsync(CancellationToken cancellationToken) =>
        await db.Rewards.OrderBy(r => r.CostXp).ToListAsync(cancellationToken);

    public Task<Reward?> FindRewardAsync(Guid rewardId, CancellationToken cancellationToken) =>
        db.Rewards.FirstOrDefaultAsync(r => r.Id == rewardId, cancellationToken);

    public async Task AddRewardAsync(Reward reward, CancellationToken cancellationToken)
    {
        db.Rewards.Add(reward);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task AddRedemptionAsync(RewardRedemption redemption, CancellationToken cancellationToken)
    {
        db.RewardRedemptions.Add(redemption);
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task<RewardRedemption?> FindRedemptionWithRewardAsync(Guid redemptionId, CancellationToken cancellationToken) =>
        db.RewardRedemptions
            .Include(r => r.Reward)
            .Include(r => r.Child)
            .FirstOrDefaultAsync(r => r.Id == redemptionId, cancellationToken);

    public async Task UpdateRedemptionAsync(RewardRedemption redemption, CancellationToken cancellationToken) =>
        await db.SaveChangesAsync(cancellationToken);

    public async Task<IReadOnlyDictionary<Guid, RewardRedemption>> GetLatestRedemptionsByRewardAsync(
        Guid childId, CancellationToken cancellationToken)
    {
        var all = await db.RewardRedemptions
            .Where(r => r.ChildId == childId)
            .ToListAsync(cancellationToken);

        return all
            .GroupBy(r => r.RewardId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.RedeemedAt).First());
    }

    public async Task<IReadOnlyList<RewardRedemption>> GetPendingRedemptionsForChildrenAsync(
        IReadOnlyList<Guid> childIds, CancellationToken cancellationToken) =>
        await db.RewardRedemptions
            .Include(r => r.Reward)
            .Include(r => r.Child)
            .Where(r => childIds.Contains(r.ChildId) && r.Status == "pending")
            .OrderBy(r => r.RedeemedAt)
            .ToListAsync(cancellationToken);
}
