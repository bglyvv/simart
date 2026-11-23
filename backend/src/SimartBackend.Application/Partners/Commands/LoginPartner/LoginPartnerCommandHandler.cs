using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Partners.Dtos;

namespace SimartBackend.Application.Partners.Commands.LoginPartner;

public sealed class LoginPartnerCommandHandler(
    IPartnerAccountRepository repository, IPasswordHasher passwordHasher, IAuthTokenService authTokenService)
    : IRequestHandler<LoginPartnerCommand, PartnerAccountDto>
{
    public async Task<PartnerAccountDto> Handle(LoginPartnerCommand request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var partner = await repository.FindPartnerByEmailAsync(email, cancellationToken);
        if (partner is null || !passwordHasher.Verify(partner.PasswordHash, request.Password))
            throw new InvalidPartnerCredentialsException();

        var token = authTokenService.IssuePartnerToken(partner.Id, partner.Email);
        return new PartnerAccountDto(partner.Id, partner.Name, partner.Email, token);
    }
}
