using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Admin.Dtos;

namespace SimartBackend.Application.Admin.Commands.LoginAdmin;

public sealed class LoginAdminCommandHandler(
    IAdminAccountRepository repository,
    IPasswordHasher passwordHasher,
    IAuthTokenService authTokenService)
    : IRequestHandler<LoginAdminCommand, AdminAccountDto>
{
    public async Task<AdminAccountDto> Handle(LoginAdminCommand request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var admin = await repository.FindAdminByEmailAsync(email, cancellationToken);
        if (admin is null || !passwordHasher.Verify(admin.PasswordHash, request.Password))
            throw new InvalidAdminCredentialsException();

        var token = authTokenService.IssueAdminToken(admin.Id, admin.Email);
        return new AdminAccountDto(admin.Id, admin.FullName, admin.Email, token);
    }
}
