namespace SimartBackend.Application.Abstractions;

/// <summary>Hashes/verifies secrets — used for both Parent.PasswordHash and
/// Parent.PinHash (the PIN is just a shorter secret, same algorithm). Implemented in
/// Infrastructure via ASP.NET Core Identity's PasswordHasher (PBKDF2) — Application
/// only ever sees this interface, same pattern as IPlaylistCatalog.</summary>
public interface IPasswordHasher
{
    string Hash(string plainText);
    bool Verify(string hash, string plainText);
}
