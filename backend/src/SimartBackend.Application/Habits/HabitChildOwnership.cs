using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Habits;

/// <summary>Shared by CompleteHabitTask/UncompleteHabitTask/GetHabitCompletions —
/// all three are keyed by childId (not familyId, since the resource is "a child's
/// completions"), so each needs the same "does this child belong to the caller's
/// family" check before touching anything.</summary>
internal static class HabitChildOwnership
{
    public static async Task EnsureCallerOwnsChildAsync(
        IFamilyAccountRepository familyAccountRepository, Guid callerFamilyId, Guid childId, CancellationToken cancellationToken)
    {
        var childFamilyId = await familyAccountRepository.GetFamilyIdForChildAsync(childId, cancellationToken);
        if (childFamilyId is null)
            throw new HabitChildNotFoundException(childId);
        if (childFamilyId != callerFamilyId)
            throw new HabitAccessDeniedException();
    }
}
