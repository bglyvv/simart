using MediatR;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Queries.GetPendingRedemptions;

public sealed record GetPendingRedemptionsQuery(Guid CallerFamilyId) : IRequest<IReadOnlyList<RewardRedemptionDto>>;
