using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Queries.GetAdminRewardProposals;

public sealed class GetAdminRewardProposalsQueryHandler(IRewardProposalRepository proposalRepository)
    : IRequestHandler<GetAdminRewardProposalsQuery, IReadOnlyList<RewardProposalDto>>
{
    public async Task<IReadOnlyList<RewardProposalDto>> Handle(GetAdminRewardProposalsQuery request, CancellationToken cancellationToken)
    {
        var proposals = await proposalRepository.GetAllProposalsAsync(request.Status, cancellationToken);
        return proposals.Select(RewardProposalDto.FromDomain).ToList();
    }
}
