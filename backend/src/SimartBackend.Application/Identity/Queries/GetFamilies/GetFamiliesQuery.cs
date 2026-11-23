using MediatR;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Queries.GetFamilies;

/// <summary>Admin-only: every registered family with its parents and children.
/// Backs GET /api/admin/families.</summary>
public sealed record GetFamiliesQuery : IRequest<IReadOnlyList<FamilySummaryDto>>;
