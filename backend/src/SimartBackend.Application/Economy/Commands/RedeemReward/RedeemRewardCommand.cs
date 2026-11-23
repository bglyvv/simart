using MediatR;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Commands.RedeemReward;

public sealed record RedeemRewardCommand(Guid CallerFamilyId, Guid ChildId, Guid RewardId) : IRequest<RewardRedemptionDto>;
