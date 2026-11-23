using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.AdminAcceptRewardProposal;

/// <summary>Admin accepting a proposal's terms exactly as the partner
/// submitted them — publishes immediately, no partner reconfirmation step
/// (they already proposed these exact terms; only an edited proposal needs
/// to go back to them, see AdminEditRewardProposalCommand). Valid from
/// PendingAdminReview or RejectedByPartner (accepting the *original* terms
/// after the partner turned down an edit is a legitimate way to resolve
/// that loop).</summary>
public sealed class AdminAcceptRewardProposalCommandHandler(
    IRewardProposalRepository proposalRepository, IRewardRepository rewardRepository)
    : IRequestHandler<AdminAcceptRewardProposalCommand, RewardProposalDto>
{
    public async Task<RewardProposalDto> Handle(AdminAcceptRewardProposalCommand request, CancellationToken cancellationToken)
    {
        var proposal = await proposalRepository.FindProposalAsync(request.ProposalId, cancellationToken)
            ?? throw new RewardProposalNotFoundException(request.ProposalId);

        if (proposal.Status != RewardProposalStatus.PendingAdminReview && proposal.Status != RewardProposalStatus.RejectedByPartner)
            throw new InvalidRewardProposalStatusException(proposal.Status, "pending_admin_review or rejected_by_partner");

        var reward = RewardProposalPublishing.BuildReward(proposal, proposal.Partner);
        await rewardRepository.AddRewardAsync(reward, cancellationToken);

        proposal.PublishedRewardId = reward.Id;
        proposal.Status = RewardProposalStatus.Approved;
        proposal.UpdatedAt = DateTimeOffset.UtcNow;
        await proposalRepository.SaveProposalAsync(proposal, cancellationToken);

        await proposalRepository.AddEventAsync(new()
        {
            Id = Guid.NewGuid(),
            ProposalId = proposal.Id,
            EventType = RewardProposalEventType.AcceptedByAdmin,
            ActorType = RewardProposalEventType.ActorAdmin,
            ActorId = request.AdminId,
            OccurredAt = DateTimeOffset.UtcNow,
        }, cancellationToken);
        await proposalRepository.AddEventAsync(new()
        {
            Id = Guid.NewGuid(),
            ProposalId = proposal.Id,
            EventType = RewardProposalEventType.Published,
            ActorType = RewardProposalEventType.ActorAdmin,
            ActorId = request.AdminId,
            OccurredAt = DateTimeOffset.UtcNow,
        }, cancellationToken);

        var saved = await proposalRepository.FindProposalAsync(proposal.Id, cancellationToken);
        return RewardProposalDto.FromDomain(saved!);
    }
}
