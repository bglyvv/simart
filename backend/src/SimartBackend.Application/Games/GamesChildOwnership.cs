using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Games;

/// <summary>Shared by RecordGamePlay/GetGamePlays — both are keyed by childId
/// (not familyId), so each needs the same "does this child belong to the
/// caller's family" check before touching anything. Same shape as
/// FocusChildOwnership/HabitChildOwnership, kept as its own small copy rather
/// than a shared cross-domain helper — each domain's ownership check throws its
/// own exception types, which Program.cs's endpoint-specific catch blocks map
/// to responses.</summary>
internal static class GamesChildOwnership
{
    public static async Task EnsureCallerOwnsChildAsync(
        IFamilyAccountRepository familyAccountRepository, Guid callerFamilyId, Guid childId, CancellationToken cancellationToken)
    {
        var childFamilyId = await familyAccountRepository.GetFamilyIdForChildAsync(childId, cancellationToken);
        if (childFamilyId is null)
            throw new GameChildNotFoundException(childId);
        if (childFamilyId != callerFamilyId)
            throw new GameAccessDeniedException();
    }
}
