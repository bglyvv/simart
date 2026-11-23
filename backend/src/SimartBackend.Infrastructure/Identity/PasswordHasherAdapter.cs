using Microsoft.AspNetCore.Identity;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Infrastructure.Identity;

/// <summary>PBKDF2 hashing via ASP.NET Core Identity's PasswordHasher primitive —
/// just the hashing algorithm, no UserManager/stores/full Identity scaffolding. The
/// generic TUser parameter isn't used functionally, so a fixed dummy instance stands
/// in for it.</summary>
public sealed class PasswordHasherAdapter : IPasswordHasher
{
    private static readonly object HasherUser = new();
    private readonly PasswordHasher<object> _hasher = new();

    public string Hash(string plainText) => _hasher.HashPassword(HasherUser, plainText);

    public bool Verify(string hash, string plainText) =>
        _hasher.VerifyHashedPassword(HasherUser, hash, plainText) != PasswordVerificationResult.Failed;
}
