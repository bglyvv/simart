using SimartBackend.Domain.Entities.Partners;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where partner accounts are looked up. Implemented in
/// Infrastructure against SimartDbContext — Application only ever sees this
/// interface, same pattern as IAdminAccountRepository. Deliberately has no
/// "add" method reachable from a command: same "no self-service signup, a
/// fixed set seeded idempotently at startup" shape as Admin's own account —
/// see Program.cs's startup seeding comment.</summary>
public interface IPartnerAccountRepository
{
    /// <summary>Case-insensitive — callers should pass an already-normalized
    /// (trimmed, lowercased) email.</summary>
    Task<Partner?> FindPartnerByEmailAsync(string email, CancellationToken cancellationToken);
}
