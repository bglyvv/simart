using MediatR;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.PartnerApproveRewardProposal;

public sealed record PartnerApproveRewardProposalCommand(Guid CallerPartnerId, Guid ProposalId) : IRequest<RewardProposalDto>;
