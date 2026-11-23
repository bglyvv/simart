using MediatR;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Queries.GetRewards;

public sealed record GetRewardsQuery(Guid CallerFamilyId, Guid ChildId) : IRequest<IReadOnlyList<RewardDto>>;
