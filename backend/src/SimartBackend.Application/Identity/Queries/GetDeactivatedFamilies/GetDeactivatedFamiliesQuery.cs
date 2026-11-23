using MediatR;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Queries.GetDeactivatedFamilies;

/// <summary>Admin-only: every deactivated family, most recently deactivated first.
/// Backs the "Deaktiv edilmiş" tab, GET /api/admin/families/deactivated.</summary>
public sealed record GetDeactivatedFamiliesQuery : IRequest<IReadOnlyList<FamilySummaryDto>>;
