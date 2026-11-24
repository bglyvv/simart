namespace SimartBackend.Application.Habits;

/// <summary>Thrown by AddHabitTaskCommandHandler when the given categoryId doesn't
/// exist — mapped to 404 by the Api endpoint. Also thrown by
/// CreateFamilyHabitTaskCommandHandler for the same reason.</summary>
public sealed class HabitCategoryNotFoundException(Guid categoryId)
    : Exception($"Habit category '{categoryId}' was not found.");

/// <summary>Thrown by CreateFamilyHabitTaskCommandHandler when a family already has
/// FamilyHabitLimits.MaxTasksPerFamily custom tasks — mapped to 409 by the Api
/// endpoint (a state-dependent limit, same conflict shape as EmailAlreadyUsedException).</summary>
public sealed class TooManyFamilyHabitTasksException(Guid familyId)
    : Exception($"Family '{familyId}' already has the maximum of {FamilyHabitLimits.MaxTasksPerFamily} custom habits.");

/// <summary>Thrown by CreateFamilyHabitTaskCommandHandler when xpValue exceeds
/// FamilyHabitLimits.MaxXpValue — mapped to 400 by the Api endpoint.</summary>
public sealed class HabitTaskXpTooHighException(int xpValue)
    : Exception($"XP value {xpValue} exceeds the maximum of {FamilyHabitLimits.MaxXpValue} for a family-created habit.");

/// <summary>Thrown by the habit-completion handlers when the given taskId doesn't
/// exist — mapped to 404.</summary>
public sealed class HabitTaskNotFoundException(Guid taskId)
    : Exception($"Habit task '{taskId}' was not found.");

/// <summary>Thrown by the habit-completion handlers when the given childId doesn't
/// exist — mapped to 404. Distinct from Identity's FamilyNotFoundException: this one
/// is about resolving which family owns a child for the completion-ownership check,
/// not about family existence itself.</summary>
public sealed class HabitChildNotFoundException(Guid childId)
    : Exception($"Child '{childId}' was not found.");

/// <summary>Thrown by the habit-completion handlers when the caller's token family
/// doesn't own the given child — mapped to 403, same "can't write into another
/// family" rule AddChild/GetChildren already enforce, just resolved via the child
/// instead of a familyId already in the route.</summary>
public sealed class HabitAccessDeniedException()
    : Exception("This child does not belong to your family.");

/// <summary>Thrown by CreateFamilyHabitTaskCommandHandler when no child was
/// selected — mapped to 400. A custom habit must be assigned to at least one
/// child; it no longer defaults to "every family child" on an empty
/// selection.</summary>
public sealed class NoChildrenSelectedException()
    : Exception("At least one child must be selected.");
