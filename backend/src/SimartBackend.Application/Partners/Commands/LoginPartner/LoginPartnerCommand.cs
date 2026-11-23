using MediatR;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.LoginPartner;

public sealed record LoginPartnerCommand(string Email, string Password) : IRequest<PartnerAccountDto>;
