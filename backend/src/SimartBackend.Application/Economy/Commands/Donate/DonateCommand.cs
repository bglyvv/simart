using MediatR;
using SimartBackend.Application.Economy.Dtos;

namespace SimartBackend.Application.Economy.Commands.Donate;

public sealed record DonateCommand(Guid CallerFamilyId, Guid ChildId, Guid CampaignId) : IRequest<DonationResultDto>;
