using MediatR;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Queries.GetPartnerRewardProposals;

public sealed record GetPartnerRewardProposalsQuery(Guid CallerPartnerId) : IRequest<IReadOnlyList<RewardProposalDto>>;
