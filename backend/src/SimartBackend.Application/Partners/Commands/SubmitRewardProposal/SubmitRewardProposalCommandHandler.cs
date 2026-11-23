using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Partners.Dtos;
using SimartBackend.Domain.Entities.Partners;

namespace SimartBackend.Application.Partners.Commands.SubmitRewardProposal;

/// <summary>A partner proposing a new reward for the catalog — "partner can
/// create something that can be redeemed using XP." Starts
/// PendingAdminReview; see RewardProposal's own doc comment for the full
/// review lifecycle from here.</summary>
public sealed class SubmitRewardProposalCommandHandler(IRewardProposalRepository proposalRepository)
    : IRequestHandler<SubmitRewardProposalCommand, RewardProposalDto>
{
    public async Task<RewardProposalDto> Handle(SubmitRewardProposalCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new InvalidRewardProposalFieldsException("Title is required.");
        if (request.CostXp < RewardProposalLimits.MinCostXp || request.CostXp > RewardProposalLimits.MaxCostXp)
            throw new InvalidRewardProposalFieldsException(
                $"CostXp must be between {RewardProposalLimits.MinCostXp} and {RewardProposalLimits.MaxCostXp}.");

        var proposal = new RewardProposal
        {
            Id = Guid.NewGuid(),
            PartnerId = request.CallerPartnerId,
            Title = request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            CostXp = request.CostXp,
            Icon = request.Icon,
            Status = RewardProposalStatus.PendingAdminReview,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        await proposalRepository.AddProposalAsync(proposal, cancellationToken);

        await proposalRepository.AddEventAsync(new RewardProposalEvent
        {
            Id = Guid.NewGuid(),
            ProposalId = proposal.Id,
            EventType = RewardProposalEventType.Submitted,
            ActorType = RewardProposalEventType.ActorPartner,
            ActorId = request.CallerPartnerId,
            OccurredAt = DateTimeOffset.UtcNow,
        }, cancellationToken);

        var saved = await proposalRepository.FindProposalAsync(proposal.Id, cancellationToken);
        return RewardProposalDto.FromDomain(saved!);
    }
}
