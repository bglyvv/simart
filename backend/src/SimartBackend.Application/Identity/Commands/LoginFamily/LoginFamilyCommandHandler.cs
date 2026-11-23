using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Identity.Dtos;

namespace SimartBackend.Application.Identity.Commands.LoginFamily;

public sealed class LoginFamilyCommandHandler(
    IFamilyAccountRepository repository,
    IPasswordHasher passwordHasher,
    IAuthTokenService authTokenService)
    : IRequestHandler<LoginFamilyCommand, FamilyAccountDto>
{
    public async Task<FamilyAccountDto> Handle(LoginFamilyCommand request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var parent = await repository.FindParentByEmailAsync(email, cancellationToken);
        if (parent is null || !passwordHasher.Verify(parent.PasswordHash, request.Password))
            throw new InvalidCredentialsException();

        var token = authTokenService.IssueFamilyToken(parent.FamilyId, parent.Id, parent.Email);
        return new FamilyAccountDto(parent.FamilyId, parent.Id, parent.FullName, parent.Email, token);
    }
}
