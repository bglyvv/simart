using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.AdminEditRewardProposal;

/// <summary>Admin changing a partner's proposed terms — moves it to
/// AdminEditedPendingPartner, where it waits in the partner's own panel for
/// them to approve or reject these new terms (see
/// PartnerApprove/RejectRewardProposalCommand). Valid from any non-terminal
/// status (PendingAdminReview, AdminEditedPendingPartner itself — editing
/// again before the partner responds, or RejectedByPartner — revising after
/// a rejection); not from Approved/DeclinedByAdmin, both terminal.</summary>
public sealed class AdminEditRewardProposalCommandHandler(IRewardProposalRepository proposalRepository)
    : IRequestHandler<AdminEditRewardProposalCommand, RewardProposalDto>
{
    public async Task<RewardProposalDto> Handle(AdminEditRewardProposalCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new InvalidRewardProposalFieldsException("Title is required.");
        if (request.CostXp < RewardProposalLimits.MinCostXp || request.CostXp > RewardProposalLimits.MaxCostXp)
            throw new InvalidRewardProposalFieldsException(
                $"CostXp must be between {RewardProposalLimits.MinCostXp} and {RewardProposalLimits.MaxCostXp}.");

        var proposal = await proposalRepository.FindProposalAsync(request.ProposalId, cancellationToken)
            ?? throw new RewardProposalNotFoundException(request.ProposalId);

        if (proposal.Status is RewardProposalStatus.Approved or RewardProposalStatus.DeclinedByAdmin)
            throw new InvalidRewardProposalStatusException(proposal.Status, "a non-final status");

        var changes = new List<string>();
        if (proposal.Title != request.Title) changes.Add($"Title: '{proposal.Title}' → '{request.Title}'");
        if (proposal.Description != request.Description) changes.Add("Description changed");
        if (proposal.CostXp != request.CostXp) changes.Add($"CostXp: {proposal.CostXp} → {request.CostXp}");
        if (proposal.Icon != request.Icon) changes.Add($"Icon: '{proposal.Icon}' → '{request.Icon}'");

        proposal.Title = request.Title.Trim();
        proposal.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        proposal.CostXp = request.CostXp;
        proposal.Icon = request.Icon;
        proposal.Status = RewardProposalStatus.AdminEditedPendingPartner;
        proposal.UpdatedAt = DateTimeOffset.UtcNow;
        await proposalRepository.SaveProposalAsync(proposal, cancellationToken);

        await proposalRepository.AddEventAsync(new()
        {
            Id = Guid.NewGuid(),
            ProposalId = proposal.Id,
            EventType = RewardProposalEventType.EditedByAdmin,
            ActorType = RewardProposalEventType.ActorAdmin,
            ActorId = request.AdminId,
            Note = changes.Count > 0 ? string.Join("; ", changes) : "No fields actually changed",
            OccurredAt = DateTimeOffset.UtcNow,
        }, cancellationToken);

        var saved = await proposalRepository.FindProposalAsync(proposal.Id, cancellationToken);
        return RewardProposalDto.FromDomain(saved!);
    }
}
