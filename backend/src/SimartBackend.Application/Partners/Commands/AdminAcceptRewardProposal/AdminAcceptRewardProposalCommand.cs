using MediatR;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.AdminAcceptRewardProposal;

public sealed record AdminAcceptRewardProposalCommand(Guid ProposalId, Guid AdminId) : IRequest<RewardProposalDto>;
