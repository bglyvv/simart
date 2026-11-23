using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.PartnerRejectRewardProposal;

/// <summary>The partner turning down the admin's edited terms — loops back
/// to RejectedByPartner (not a terminal state) so the admin sees it needs
/// another look, per how this was explicitly scoped: a partner rejection
/// goes back to the admin to revise again, not straight to closed (that's
/// AdminDeclineRewardProposalCommand's job instead).</summary>
public sealed class PartnerRejectRewardProposalCommandHandler(IRewardProposalRepository proposalRepository)
    : IRequestHandler<PartnerRejectRewardProposalCommand, RewardProposalDto>
{
    public async Task<RewardProposalDto> Handle(PartnerRejectRewardProposalCommand request, CancellationToken cancellationToken)
    {
        var proposal = await proposalRepository.FindProposalAsync(request.ProposalId, cancellationToken)
            ?? throw new RewardProposalNotFoundException(request.ProposalId);

        if (proposal.PartnerId != request.CallerPartnerId)
            throw new RewardProposalAccessDeniedException();

        if (proposal.Status != RewardProposalStatus.AdminEditedPendingPartner)
            throw new InvalidRewardProposalStatusException(proposal.Status, "admin_edited_pending_partner");

        proposal.Status = RewardProposalStatus.RejectedByPartner;
        proposal.UpdatedAt = DateTimeOffset.UtcNow;
        await proposalRepository.SaveProposalAsync(proposal, cancellationToken);

        await proposalRepository.AddEventAsync(new()
        {
            Id = Guid.NewGuid(),
            ProposalId = proposal.Id,
            EventType = RewardProposalEventType.RejectedByPartner,
            ActorType = RewardProposalEventType.ActorPartner,
            ActorId = request.CallerPartnerId,
            Note = request.Note,
            OccurredAt = DateTimeOffset.UtcNow,
        }, cancellationToken);

        var saved = await proposalRepository.FindProposalAsync(proposal.Id, cancellationToken);
        return RewardProposalDto.FromDomain(saved!);
    }
}
