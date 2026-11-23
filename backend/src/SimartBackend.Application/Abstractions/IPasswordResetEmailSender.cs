namespace SimartBackend.Application.Abstractions;

/// <summary>Composes and sends the "reset your password" email. Infrastructure owns
/// every environment-specific detail — the real link's base URL, the actual email
/// provider call — so Application only ever hands over who it's for and the raw
/// token; it never builds a URL or touches IConfiguration itself.</summary>
public interface IPasswordResetEmailSender
{
    Task SendResetEmailAsync(string toEmail, string fullName, string rawToken, CancellationToken cancellationToken);
}
