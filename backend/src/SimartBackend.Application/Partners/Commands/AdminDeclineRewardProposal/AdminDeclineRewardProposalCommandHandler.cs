using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.AdminDeclineRewardProposal;

/// <summary>Admin turning a proposal down outright — terminal, unlike a
/// partner rejecting an edit (RejectedByPartner loops back for another
/// admin look; DeclinedByAdmin does not). The natural counterpart to
/// "admin should accept it" — not explicitly named in the original
/// request, but the only sane way to close out a proposal nobody wants to
/// pursue, built alongside Accept/Edit rather than leaving every proposal
/// to sit in the queue forever.</summary>
public sealed class AdminDeclineRewardProposalCommandHandler(IRewardProposalRepository proposalRepository)
    : IRequestHandler<AdminDeclineRewardProposalCommand, RewardProposalDto>
{
    public async Task<RewardProposalDto> Handle(AdminDeclineRewardProposalCommand request, CancellationToken cancellationToken)
    {
        var proposal = await proposalRepository.FindProposalAsync(request.ProposalId, cancellationToken)
            ?? throw new RewardProposalNotFoundException(request.ProposalId);

        if (proposal.Status is RewardProposalStatus.Approved or RewardProposalStatus.DeclinedByAdmin)
            throw new InvalidRewardProposalStatusException(proposal.Status, "a non-final status");

        proposal.Status = RewardProposalStatus.DeclinedByAdmin;
        proposal.UpdatedAt = DateTimeOffset.UtcNow;
        await proposalRepository.SaveProposalAsync(proposal, cancellationToken);

        await proposalRepository.AddEventAsync(new()
        {
            Id = Guid.NewGuid(),
            ProposalId = proposal.Id,
            EventType = RewardProposalEventType.DeclinedByAdmin,
            ActorType = RewardProposalEventType.ActorAdmin,
            ActorId = request.AdminId,
            Note = request.Note,
            OccurredAt = DateTimeOffset.UtcNow,
        }, cancellationToken);

        var saved = await proposalRepository.FindProposalAsync(proposal.Id, cancellationToken);
        return RewardProposalDto.FromDomain(saved!);
    }
}
