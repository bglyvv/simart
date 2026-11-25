using MediatR;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Queries.GetPendingProfileChangeRequests;

/// <summary>The parent's own review queue — every pending request across all
/// of CallerFamilyId's children, same shape GetPendingRedemptionsQuery
/// already uses for the reward-approval queue.</summary>
public sealed record GetPendingProfileChangeRequestsQuery(Guid CallerFamilyId)
    : IRequest<IReadOnlyList<ChildProfileChangeRequestDto>>;
