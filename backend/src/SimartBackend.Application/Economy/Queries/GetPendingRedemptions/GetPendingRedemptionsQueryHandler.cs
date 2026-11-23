using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Queries.GetPendingRedemptions;

public sealed class GetPendingRedemptionsQueryHandler(
    IFamilyAccountRepository familyAccountRepository, IRewardRepository rewardRepository)
    : IRequestHandler<GetPendingRedemptionsQuery, IReadOnlyList<RewardRedemptionDto>>
{
    public async Task<IReadOnlyList<RewardRedemptionDto>> Handle(
        GetPendingRedemptionsQuery request, CancellationToken cancellationToken)
    {
        var children = await familyAccountRepository.GetChildrenAsync(request.CallerFamilyId, cancellationToken);
        var childIds = children.Select(c => c.Id).ToList();

        var pending = await rewardRepository.GetPendingRedemptionsForChildrenAsync(childIds, cancellationToken);
        return pending.Select(RewardRedemptionDto.FromDomain).ToList();
    }
}
