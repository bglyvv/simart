using MediatR;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Queries.GetChildren;

/// <summary>A family's own children — backs GET /api/identity/families/{familyId}/children,
/// gated the same way as AddChildCommand's endpoint (caller's token must be for this
/// familyId). Lets a returning parent (e.g. on a new device, no local cache) recover
/// which child profile(s) to resume after LoginFamilyCommand alone, which only ever
/// returns family/parent info.</summary>
public sealed record GetChildrenQuery(Guid FamilyId) : IRequest<IReadOnlyList<ChildDto>>;
