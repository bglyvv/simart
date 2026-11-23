using MediatR;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Commands.ApproveRewardRedemption;

public sealed record ApproveRewardRedemptionCommand(Guid CallerFamilyId, Guid CallerParentId, Guid RedemptionId)
    : IRequest<RewardRedemptionDto>;
