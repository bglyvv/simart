namespace SimartBackend.Application.Habits;

/// <summary>Caps on a family's own custom habit tasks (see CreateFamilyHabitTaskCommand)
/// — product rule, not a technical one: a parent shouldn't be able to overload their
/// child's daily list or hand out oversized XP via a self-created task. Doesn't apply
/// to the shared admin catalog (AddHabitTaskCommand) — a platform admin is trusted
/// differently than a parent creating tasks for their own family.</summary>
public static class FamilyHabitLimits
{
    public const int MaxTasksPerFamily = 5;
    public const int MaxXpValue = 10;
}
