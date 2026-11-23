using System.Security.Cryptography;
using System.Text;

namespace SimartBackend.Application.Identity;

/// <summary>Shared between ForgotPasswordCommandHandler (generates + hashes) and
/// ResetPasswordCommandHandler (hashes again, to look the row up by the same
/// value) — one place for the token shape so the two sides can't drift.</summary>
public static class PasswordResetTokens
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(1);

    /// <summary>A 256-bit cryptographically random value, URL-safe base64 — this is
    /// the only time the raw token exists outside the user's email client and their
    /// one reset request; never stored anywhere, only its hash is.</summary>
    public static string GenerateRaw()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    public static string Hash(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
