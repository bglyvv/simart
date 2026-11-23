using MediatR;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.SubmitRewardProposal;

public sealed record SubmitRewardProposalCommand(
    Guid CallerPartnerId, string Title, string? Description, int CostXp, string Icon)
    : IRequest<RewardProposalDto>;
