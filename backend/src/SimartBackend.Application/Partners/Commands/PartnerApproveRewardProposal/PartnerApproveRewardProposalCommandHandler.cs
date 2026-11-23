using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.PartnerApproveRewardProposal;

/// <summary>The partner signing off on the admin's edited terms — only
/// meaningful from AdminEditedPendingPartner (the admin changed something
/// and is waiting on this). Publishes immediately, same as
/// AdminAcceptRewardProposalCommand's own publish step.</summary>
public sealed class PartnerApproveRewardProposalCommandHandler(
    IRewardProposalRepository proposalRepository, IRewardRepository rewardRepository)
    : IRequestHandler<PartnerApproveRewardProposalCommand, RewardProposalDto>
{
    public async Task<RewardProposalDto> Handle(PartnerApproveRewardProposalCommand request, CancellationToken cancellationToken)
    {
        var proposal = await proposalRepository.FindProposalAsync(request.ProposalId, cancellationToken)
            ?? throw new RewardProposalNotFoundException(request.ProposalId);

        if (proposal.PartnerId != request.CallerPartnerId)
            throw new RewardProposalAccessDeniedException();

        if (proposal.Status != RewardProposalStatus.AdminEditedPendingPartner)
            throw new InvalidRewardProposalStatusException(proposal.Status, "admin_edited_pending_partner");

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
            EventType = RewardProposalEventType.ApprovedByPartner,
            ActorType = RewardProposalEventType.ActorPartner,
            ActorId = request.CallerPartnerId,
            OccurredAt = DateTimeOffset.UtcNow,
        }, cancellationToken);
        await proposalRepository.AddEventAsync(new()
        {
            Id = Guid.NewGuid(),
            ProposalId = proposal.Id,
            EventType = RewardProposalEventType.Published,
            ActorType = RewardProposalEventType.ActorPartner,
            ActorId = request.CallerPartnerId,
            OccurredAt = DateTimeOffset.UtcNow,
        }, cancellationToken);

        var saved = await proposalRepository.FindProposalAsync(proposal.Id, cancellationToken);
        return RewardProposalDto.FromDomain(saved!);
    }
}
