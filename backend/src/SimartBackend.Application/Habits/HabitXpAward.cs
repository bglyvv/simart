namespace SimartBackend.Application.Habits;

/// <summary>The dynamic streak bonus CompleteHabitTaskCommand adds on top of a
/// task's own XpValue — requested explicitly: completing the same task on
/// consecutive days should earn more than the task's static base amount.
/// +1 XP per consecutive day (today included), capped so a long streak doesn't
/// dwarf the task's own value. A single, non-consecutive completion earns no
/// bonus at all (StreakDays == 1 -> 0).</summary>
public static class HabitXpAward
{
    public const int MaxStreakBonus = 5;

    /// <summary>What CompleteHabitTaskCommandHandler tags every habit-sourced
    /// XpTransaction with (XpTransaction.SourceType) — lets a completion's award
    /// be found again later (UncompleteHabitTaskCommandHandler's reversal,
    /// GetHabitCompletionsQueryHandler's XpAwarded lookup) by XpTransaction.SourceId
    /// matching the HabitCompletion's own Id.</summary>
    public const string SourceType = "habit_completion";

    public static int CalculateStreakBonus(int streakDays) => Math.Clamp(streakDays - 1, 0, MaxStreakBonus);
}
