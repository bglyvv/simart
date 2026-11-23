using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Application.Identity.Commands.ForgotPassword;

public sealed class ForgotPasswordCommandHandler(
    IFamilyAccountRepository repository, IPasswordResetEmailSender emailSender)
    : IRequestHandler<ForgotPasswordCommand>
{
    public async Task Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var parent = await repository.FindParentByEmailAsync(email, cancellationToken);
        // Silent no-op for an email that isn't registered — same reasoning as
        // InvalidCredentialsException's shared message: the Api endpoint always
        // responds the same way either way, so this can't be used to find out
        // which emails have an account.
        if (parent is null)
            return;

        var rawToken = PasswordResetTokens.GenerateRaw();
        await repository.AddPasswordResetTokenAsync(new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            ParentId = parent.Id,
            TokenHash = PasswordResetTokens.Hash(rawToken),
            ExpiresAt = DateTimeOffset.UtcNow.Add(PasswordResetTokens.Lifetime),
            CreatedAt = DateTimeOffset.UtcNow,
        }, cancellationToken);

        await emailSender.SendResetEmailAsync(parent.Email, parent.FullName, rawToken, cancellationToken);
    }
}
