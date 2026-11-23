using MediatR;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Commands.RejectRewardRedemption;

public sealed record RejectRewardRedemptionCommand(Guid CallerFamilyId, Guid CallerParentId, Guid RedemptionId)
    : IRequest<RewardRedemptionDto>;
