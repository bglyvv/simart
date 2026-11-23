using SimartBackend.Domain.Entities.Economy;
using SimartBackend.Domain.Entities.Partners;

namespace SimartBackend.Application.Partners;

/// <summary>Shared by AdminAcceptRewardProposalCommandHandler and
/// PartnerApproveRewardProposalCommandHandler — both reach "publish this
/// proposal as a real Reward" the same way, just via different approval
/// paths (admin accepting as-is, or the partner approving an admin's edit).</summary>
internal static class RewardProposalPublishing
{
    public static Reward BuildReward(RewardProposal proposal, Partner partner) => new()
    {
        Id = Guid.NewGuid(),
        Title = proposal.Title,
        Description = proposal.Description,
        CostXp = proposal.CostXp,
        Icon = proposal.Icon,
        Sponsor = partner.Name,
        PartnerId = proposal.PartnerId,
    };
}
