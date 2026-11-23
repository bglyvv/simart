using MediatR;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Commands.LoginFamily;

public sealed record LoginFamilyCommand(string Email, string Password) : IRequest<FamilyAccountDto>;
