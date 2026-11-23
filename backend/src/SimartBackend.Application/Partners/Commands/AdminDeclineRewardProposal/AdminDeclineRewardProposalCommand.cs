using MediatR;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.AdminDeclineRewardProposal;

public sealed record AdminDeclineRewardProposalCommand(Guid ProposalId, Guid AdminId, string? Note) : IRequest<RewardProposalDto>;
