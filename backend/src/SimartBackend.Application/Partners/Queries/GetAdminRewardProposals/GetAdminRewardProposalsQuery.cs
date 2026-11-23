using MediatR;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Queries.GetAdminRewardProposals;

public sealed record GetAdminRewardProposalsQuery(string? Status) : IRequest<IReadOnlyList<RewardProposalDto>>;
