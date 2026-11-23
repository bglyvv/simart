using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Identity.Commands.ResetPassword;

public sealed class ResetPasswordCommandHandler(IFamilyAccountRepository repository, IPasswordHasher passwordHasher)
    : IRequestHandler<ResetPasswordCommand>
{
    public async Task Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = PasswordResetTokens.Hash(request.Token);
        var token = await repository.FindPasswordResetTokenByHashAsync(tokenHash, cancellationToken);

        if (token is null || token.UsedAt is not null || token.ExpiresAt < DateTimeOffset.UtcNow)
            throw new InvalidResetTokenException();

        await repository.ResetPasswordAsync(token, passwordHasher.Hash(request.NewPassword), cancellationToken);
    }
}
