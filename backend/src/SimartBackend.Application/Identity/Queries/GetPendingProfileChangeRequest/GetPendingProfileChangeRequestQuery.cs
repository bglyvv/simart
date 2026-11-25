using MediatR;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Queries.GetPendingProfileChangeRequest;

/// <summary>A child's own "is my request still pending" check — null (204)
/// when there's nothing outstanding, same "null is routine, not missing" rule
/// FocusMode's active-lock read already uses.</summary>
public sealed record GetPendingProfileChangeRequestQuery(Guid CallerFamilyId, Guid ChildId)
    : IRequest<ChildProfileChangeRequestDto?>;
