using MediatR;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.PartnerRejectRewardProposal;

public sealed record PartnerRejectRewardProposalCommand(Guid CallerPartnerId, Guid ProposalId, string? Note) : IRequest<RewardProposalDto>;
