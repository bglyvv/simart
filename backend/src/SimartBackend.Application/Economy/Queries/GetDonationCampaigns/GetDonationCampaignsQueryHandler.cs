using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Queries.GetDonationCampaigns;

public sealed class GetDonationCampaignsQueryHandler(IWalletRepository walletRepository)
    : IRequestHandler<GetDonationCampaignsQuery, IReadOnlyList<DonationCampaignDto>>
{
    public async Task<IReadOnlyList<DonationCampaignDto>> Handle(GetDonationCampaignsQuery request, CancellationToken cancellationToken)
    {
        var campaigns = await walletRepository.GetAllCampaignsAsync(cancellationToken);
        return campaigns.Select(DonationCampaignDto.FromDomain).ToList();
    }
}
