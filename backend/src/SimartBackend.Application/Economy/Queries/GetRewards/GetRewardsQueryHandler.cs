using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Queries.GetRewards;

public sealed class GetRewardsQueryHandler(
    IFamilyAccountRepository familyAccountRepository, IRewardRepository rewardRepository)
    : IRequestHandler<GetRewardsQuery, IReadOnlyList<RewardDto>>
{
    public async Task<IReadOnlyList<RewardDto>> Handle(GetRewardsQuery request, CancellationToken cancellationToken)
    {
        await RewardChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var rewards = await rewardRepository.GetAllRewardsAsync(cancellationToken);
        var latestByReward = await rewardRepository.GetLatestRedemptionsByRewardAsync(request.ChildId, cancellationToken);

        return rewards
            .Select(r => RewardDto.FromDomain(r, latestByReward.GetValueOrDefault(r.Id)?.Status))
            .ToList();
    }
}
