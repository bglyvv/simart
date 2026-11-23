using SimartBackend.Domain.Entities.Habits;

namespace SimartBackend.Application.Habits.Dtos;

public sealed record HabitCategoryDto(Guid Id, string Key, string Title, string Icon, IReadOnlyList<HabitTaskDto> Tasks)
{
    /// <summary>familyId filters which family-created tasks are included alongside
    /// the shared admin ones — null (e.g. the admin panel) means admin-catalog tasks
    /// only; a real familyId means that family's own tasks too. See
    /// GetHabitCategoriesQueryHandler.</summary>
    public static HabitCategoryDto FromDomain(HabitCategory category, Guid? familyId) => new(
        category.Id,
        category.Key,
        category.Title,
        category.Icon,
        category.Tasks
            .Where(t => t.FamilyId is null || t.FamilyId == familyId)
            .Select(HabitTaskDto.FromDomain)
            .ToList());
}

public sealed record HabitTaskDto(Guid Id, Guid CategoryId, string Title, string? Note, int XpValue, bool IsCustom)
{
    public static HabitTaskDto FromDomain(HabitTask task) => new(
        task.Id, task.CategoryId, task.Title, task.Note, task.XpValue, task.FamilyId is not null);
}

/// <summary>XpAwarded is null only when the caller didn't ask for it
/// (FromDomain(completion) alone) — every completion that went through
/// CompleteHabitTaskCommand always has a real XpTransaction amount behind it.</summary>
public sealed record HabitCompletionDto(Guid Id, Guid ChildId, Guid TaskId, DateOnly LogDate, int? XpAwarded = null)
{
    public static HabitCompletionDto FromDomain(HabitCompletion completion) => new(
        completion.Id, completion.ChildId, completion.TaskId, completion.LogDate);

    public static HabitCompletionDto FromDomain(HabitCompletion completion, int xpAwarded) => new(
        completion.Id, completion.ChildId, completion.TaskId, completion.LogDate, xpAwarded);
}

/// <summary>CompleteHabitTaskCommand's actual response shape — richer than
/// HabitCompletionDto because the frontend's "+N XP" feedback (and its XP-bar
/// animation) needs the base/bonus breakdown, not just the total.
/// XpAwarded == BaseXp + BonusXp always; BonusXp is HabitXpAward's streak bonus,
/// 0 on a non-consecutive completion.</summary>
/// <summary>One day in the "Həftəlik Seriya" (weekly streak) widget. State:
/// "done" (a past day with at least one completion), "today" (always this,
/// regardless of whether today already has a completion — matches the
/// pre-existing mock widget's behavior of always highlighting today distinctly),
/// "upcoming" (a future day in the same Monday-Sunday week), or "missed" (a past
/// day with no completion at all — the one case the original static mock data
/// never had to represent, since it assumed a perfect week).</summary>
public sealed record HabitStreakDayDto(DateOnly Date, string State);

/// <summary>GetHabitStreakQuery's response — ConsecutiveDays is the "🔥 N GÜN"
/// badge (see HabitStreakQueryHandler for exactly how today counts), Week is the
/// seven day-circles, Monday through Sunday, for whichever week contains Today.</summary>
public sealed record HabitStreakDto(int ConsecutiveDays, IReadOnlyList<HabitStreakDayDto> Week);

public sealed record HabitCompletionResultDto(
    Guid Id, Guid ChildId, Guid TaskId, DateOnly LogDate, int XpAwarded, int BaseXp, int BonusXp, int StreakDays)
{
    public static HabitCompletionResultDto FromDomain(HabitCompletion completion, int baseXp, int bonusXp, int streakDays) => new(
        completion.Id, completion.ChildId, completion.TaskId, completion.LogDate,
        baseXp + bonusXp, baseXp, bonusXp, streakDays);
}
