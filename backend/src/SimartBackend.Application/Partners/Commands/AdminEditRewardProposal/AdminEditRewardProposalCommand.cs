using MediatR;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.AdminEditRewardProposal;

public sealed record AdminEditRewardProposalCommand(
    Guid ProposalId, Guid AdminId, string Title, string? Description, int CostXp, string Icon)
    : IRequest<RewardProposalDto>;
