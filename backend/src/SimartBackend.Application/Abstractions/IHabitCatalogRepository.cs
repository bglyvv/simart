using SimartBackend.Domain.Entities.Economy;
using SimartBackend.Domain.Entities.Habits;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where the habit catalog (admin-shared categories/tasks plus families' own
/// custom tasks) and per-child completions are read and written. Implemented in
/// Infrastructure against SimartDbContext — Application only ever sees this
/// interface, same pattern as IFamilyAccountRepository.</summary>
public interface IHabitCatalogRepository
{
    /// <summary>Every category with its tasks loaded (never soft-deleted ones —
    /// the global query filter handles that) — both admin-catalog and every
    /// family's custom tasks; callers filter per-family, see
    /// HabitCategoryDto.FromDomain.</summary>
    Task<IReadOnlyList<HabitCategory>> GetAllCategoriesAsync(CancellationToken cancellationToken);

    Task<bool> CategoryExistsAsync(Guid categoryId, CancellationToken cancellationToken);

    Task AddCategoryAsync(HabitCategory category, CancellationToken cancellationToken);

    Task AddTaskAsync(HabitTask task, CancellationToken cancellationToken);

    /// <summary>CreateFamilyHabitTaskCommand's write — the task itself plus one
    /// HabitTaskAssignment row per selected child, in a single SaveChanges
    /// (atomic). Only ever called for a FamilyId-set task; the admin catalog's
    /// AddTaskAsync above never writes assignments.</summary>
    Task AddFamilyTaskWithAssignmentsAsync(HabitTask task, IReadOnlyList<Guid> childIds, CancellationToken cancellationToken);

    /// <summary>Batch lookup of which children a set of tasks is assigned to —
    /// GetHabitCategoriesQueryHandler's single query for an entire category
    /// list's worth of tasks, avoiding an N+1. A task absent from the result has
    /// no assignment rows at all — see HabitCategoryDto.FromDomainForChild for
    /// why that's treated as "visible to every family child," not "to none."</summary>
    Task<IReadOnlyDictionary<Guid, IReadOnlyList<Guid>>> GetAssignmentsForTasksAsync(
        IReadOnlyList<Guid> taskIds, CancellationToken cancellationToken);

    Task<bool> TaskExistsAsync(Guid taskId, CancellationToken cancellationToken);

    /// <summary>The task itself (not just whether it exists) — CompleteHabitTaskCommand
    /// needs its XpValue/Title to compute and label the award.</summary>
    Task<HabitTask?> FindTaskAsync(Guid taskId, CancellationToken cancellationToken);

    /// <summary>How many custom (FamilyId-set) tasks this family already has — the
    /// CreateFamilyHabitTaskCommand quota check.</summary>
    Task<int> CountFamilyTasksAsync(Guid familyId, CancellationToken cancellationToken);

    Task<HabitCompletion?> FindCompletionAsync(Guid childId, Guid taskId, DateOnly logDate, CancellationToken cancellationToken);

    Task AddCompletionAsync(HabitCompletion completion, CancellationToken cancellationToken);

    Task RemoveCompletionAsync(HabitCompletion completion, CancellationToken cancellationToken);

    Task<IReadOnlyList<HabitCompletion>> GetCompletionsForChildOnDateAsync(
        Guid childId, DateOnly logDate, CancellationToken cancellationToken);

    /// <summary>Every distinct date this child has at least one habit completion on
    /// — GetHabitStreakQuery's input, both for "which of the last 7 days counts as
    /// done" and for walking backward to compute the consecutive-day streak. Not
    /// windowed by date range — a family's real completion history is small enough
    /// that loading it all and working with it in memory is simpler and cheap.</summary>
    Task<IReadOnlySet<DateOnly>> GetCompletionDatesAsync(Guid childId, CancellationToken cancellationToken);

    /// <summary>How many consecutive days, counting backward from (and including)
    /// uptoAndIncludingLogDate, this child has a completion row for this exact task —
    /// the dynamic streak bonus's input (see HabitXpAward). Call this *after* the new
    /// completion for uptoAndIncludingLogDate has already been written, so today
    /// counts as day 1 of the streak, not day 0.</summary>
    Task<int> GetConsecutiveStreakDaysAsync(
        Guid childId, Guid taskId, DateOnly uptoAndIncludingLogDate, CancellationToken cancellationToken);

    /// <summary>Appends one row to the XP ledger — never a mutated counter, see
    /// XpTransaction's own doc comment. CompleteHabitTaskCommandHandler is the first
    /// writer; this table existed in the schema with no handler touching it before.</summary>
    Task AddXpTransactionAsync(XpTransaction transaction, CancellationToken cancellationToken);

    /// <summary>The ledger row for one specific source (SourceType + SourceId) — used
    /// to report the already-granted amount back on an idempotent re-complete, and to
    /// find the row UncompleteHabitTaskCommandHandler needs to remove.</summary>
    Task<XpTransaction?> FindXpTransactionBySourceAsync(
        string sourceType, Guid sourceId, CancellationToken cancellationToken);

    Task RemoveXpTransactionAsync(XpTransaction transaction, CancellationToken cancellationToken);

    /// <summary>Batch lookup of XpTransaction.Amount keyed by SourceId, for a given
    /// SourceType — GetHabitCompletionsQueryHandler's single-query way to attach
    /// XpAwarded to every completion in a day's list without an N+1.</summary>
    Task<IReadOnlyDictionary<Guid, int>> GetXpAmountsForSourceIdsAsync(
        string sourceType, IReadOnlyList<Guid> sourceIds, CancellationToken cancellationToken);

    /// <summary>Sum of every XpTransaction.Amount for this child — the real,
    /// server-side balance. Lives here (not on IRewardRepository, its first
    /// real consumer via RedeemRewardCommand) because every XpTransaction
    /// method already lives on this interface — XpTransaction itself is an
    /// Economy-domain concept, not a Habits one, but Habits was its first
    /// writer, and splitting the ledger's read/write methods across two
    /// repositories for one new caller isn't worth the churn to already-
    /// shipped code. See HabitXpAward for the per-completion side of this.</summary>
    Task<int> GetTotalXpAsync(Guid childId, CancellationToken cancellationToken);

    /// <summary>The top `limit` children by total XP (sum of every
    /// XpTransaction.Amount), highest first — GetLeaderboardQuery's real
    /// ranking, same "lives here, not a new ledger-specific repository"
    /// reasoning as GetTotalXpAsync above. Children with a total of 0 or
    /// less are excluded — nothing to rank them against yet.</summary>
    Task<IReadOnlyList<(Guid ChildId, int TotalXp)>> GetTopXpChildrenAsync(int limit, CancellationToken cancellationToken);
}
