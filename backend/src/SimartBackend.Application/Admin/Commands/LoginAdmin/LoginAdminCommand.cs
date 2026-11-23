using MediatR;
using SimartBackend.Application.Admin.Dtos;

namespace SimartBackend.Application.Admin.Commands.LoginAdmin;

public sealed record LoginAdminCommand(string Email, string Password) : IRequest<AdminAccountDto>;
