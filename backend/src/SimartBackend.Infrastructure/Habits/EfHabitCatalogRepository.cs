using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Habits;
using SimartBackend.Domain.Entities.Economy;
using SimartBackend.Domain.Entities.Habits;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure.Habits;

public sealed class EfHabitCatalogRepository(SimartDbContext db) : IHabitCatalogRepository
{
    public async Task<IReadOnlyList<HabitCategory>> GetAllCategoriesAsync(CancellationToken cancellationToken) =>
        await db.HabitCategories
            .Include(c => c.Tasks)
            .OrderBy(c => c.Title)
            .ToListAsync(cancellationToken);

    public Task<bool> CategoryExistsAsync(Guid categoryId, CancellationToken cancellationToken) =>
        db.HabitCategories.AnyAsync(c => c.Id == categoryId, cancellationToken);

    public async Task AddCategoryAsync(HabitCategory category, CancellationToken cancellationToken)
    {
        db.HabitCategories.Add(category);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task AddTaskAsync(HabitTask task, CancellationToken cancellationToken)
    {
        db.HabitTasks.Add(task);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task AddFamilyTaskWithAssignmentsAsync(
        HabitTask task, IReadOnlyList<Guid> childIds, CancellationToken cancellationToken)
    {
        db.HabitTasks.Add(task);
        foreach (var childId in childIds)
            db.HabitTaskAssignments.Add(new HabitTaskAssignment { TaskId = task.Id, ChildId = childId });
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<Guid, IReadOnlyList<Guid>>> GetAssignmentsForTasksAsync(
        IReadOnlyList<Guid> taskIds, CancellationToken cancellationToken)
    {
        var rows = await db.HabitTaskAssignments
            .Where(a => taskIds.Contains(a.TaskId))
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(a => a.TaskId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<Guid>)g.Select(a => a.ChildId).ToList());
    }

    public Task<bool> TaskExistsAsync(Guid taskId, CancellationToken cancellationToken) =>
        db.HabitTasks.AnyAsync(t => t.Id == taskId, cancellationToken);

    public Task<HabitTask?> FindTaskAsync(Guid taskId, CancellationToken cancellationToken) =>
        db.HabitTasks.FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

    public Task<int> CountFamilyTasksAsync(Guid familyId, CancellationToken cancellationToken) =>
        db.HabitTasks.CountAsync(t => t.FamilyId == familyId, cancellationToken);

    public Task<HabitCompletion?> FindCompletionAsync(Guid childId, Guid taskId, DateOnly logDate, CancellationToken cancellationToken) =>
        db.HabitCompletions.FirstOrDefaultAsync(
            c => c.ChildId == childId && c.TaskId == taskId && c.LogDate == logDate, cancellationToken);

    public async Task AddCompletionAsync(HabitCompletion completion, CancellationToken cancellationToken)
    {
        db.HabitCompletions.Add(completion);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveCompletionAsync(HabitCompletion completion, CancellationToken cancellationToken)
    {
        db.HabitCompletions.Remove(completion);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<HabitCompletion>> GetCompletionsForChildOnDateAsync(
        Guid childId, DateOnly logDate, CancellationToken cancellationToken) =>
        await db.HabitCompletions
            .Where(c => c.ChildId == childId && c.LogDate == logDate)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlySet<DateOnly>> GetCompletionDatesAsync(Guid childId, CancellationToken cancellationToken) =>
        (await db.HabitCompletions
            .Where(c => c.ChildId == childId)
            .Select(c => c.LogDate)
            .Distinct()
            .ToListAsync(cancellationToken))
        .ToHashSet();

    public async Task<int> GetConsecutiveStreakDaysAsync(
        Guid childId, Guid taskId, DateOnly uptoAndIncludingLogDate, CancellationToken cancellationToken)
    {
        // A window back from today is plenty for any realistic streak, and far
        // cheaper than loading this child+task's entire completion history.
        var windowStart = uptoAndIncludingLogDate.AddDays(-(HabitXpAward.MaxStreakBonus + 7));
        var completedDates = await db.HabitCompletions
            .Where(c => c.ChildId == childId && c.TaskId == taskId
                && c.LogDate <= uptoAndIncludingLogDate && c.LogDate >= windowStart)
            .Select(c => c.LogDate)
            .ToListAsync(cancellationToken);
        var completedSet = completedDates.ToHashSet();

        var streak = 0;
        var cursor = uptoAndIncludingLogDate;
        while (completedSet.Contains(cursor))
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }
        return streak;
    }

    public async Task AddXpTransactionAsync(XpTransaction transaction, CancellationToken cancellationToken)
    {
        db.XpTransactions.Add(transaction);
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task<XpTransaction?> FindXpTransactionBySourceAsync(
        string sourceType, Guid sourceId, CancellationToken cancellationToken) =>
        db.XpTransactions.FirstOrDefaultAsync(
            t => t.SourceType == sourceType && t.SourceId == sourceId, cancellationToken);

    public async Task RemoveXpTransactionAsync(XpTransaction transaction, CancellationToken cancellationToken)
    {
        db.XpTransactions.Remove(transaction);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<Guid, int>> GetXpAmountsForSourceIdsAsync(
        string sourceType, IReadOnlyList<Guid> sourceIds, CancellationToken cancellationToken) =>
        await db.XpTransactions
            .Where(t => t.SourceType == sourceType && sourceIds.Contains(t.SourceId))
            .ToDictionaryAsync(t => t.SourceId, t => t.Amount, cancellationToken);

    public Task<int> GetTotalXpAsync(Guid childId, CancellationToken cancellationToken) =>
        db.XpTransactions.Where(t => t.ChildId == childId).SumAsync(t => t.Amount, cancellationToken);

    public async Task<IReadOnlyList<(Guid ChildId, int TotalXp)>> GetTopXpChildrenAsync(
        int limit, CancellationToken cancellationToken)
    {
        var totals = await db.XpTransactions
            .GroupBy(t => t.ChildId)
            .Select(g => new { ChildId = g.Key, TotalXp = g.Sum(t => t.Amount) })
            .Where(x => x.TotalXp > 0)
            .OrderByDescending(x => x.TotalXp)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return totals.Select(x => (x.ChildId, x.TotalXp)).ToList();
    }
}
