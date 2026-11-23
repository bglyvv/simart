using AdminEntity = SimartBackend.Domain.Entities.Admin.Admin;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where admin accounts are looked up. Implemented in Infrastructure against
/// SimartDbContext — Application only ever sees this interface, same pattern as
/// IFamilyAccountRepository. Deliberately has no "add" method reachable from a command:
/// unlike Parent, there is no public admin signup — see Program.cs's startup seeding
/// comment for why self-service admin creation would be a real backdoor, not a
/// bridging convenience.</summary>
public interface IAdminAccountRepository
{
    /// <summary>Case-insensitive — callers should pass an already-normalized
    /// (trimmed, lowercased) email. Used by LoginAdminCommandHandler to find the
    /// PasswordHash to verify against.</summary>
    Task<AdminEntity?> FindAdminByEmailAsync(string email, CancellationToken cancellationToken);
}
