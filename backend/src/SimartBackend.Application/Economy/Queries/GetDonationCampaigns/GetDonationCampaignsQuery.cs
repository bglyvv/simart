using MediatR;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Queries.GetDonationCampaigns;

/// <summary>Open, unauthenticated read — same shape as
/// GET /api/habits/categories with no familyId: it's just the catalog, not a
/// child's data, so there's nothing to own.</summary>
public sealed record GetDonationCampaignsQuery : IRequest<IReadOnlyList<DonationCampaignDto>>;
