using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Queries.GetPartnerRewardProposals;

public sealed class GetPartnerRewardProposalsQueryHandler(IRewardProposalRepository proposalRepository)
    : IRequestHandler<GetPartnerRewardProposalsQuery, IReadOnlyList<RewardProposalDto>>
{
    public async Task<IReadOnlyList<RewardProposalDto>> Handle(GetPartnerRewardProposalsQuery request, CancellationToken cancellationToken)
    {
        var proposals = await proposalRepository.GetProposalsForPartnerAsync(request.CallerPartnerId, cancellationToken);
        return proposals.Select(RewardProposalDto.FromDomain).ToList();
    }
}
