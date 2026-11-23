using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Focus;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure.Focus;

public sealed class EfFocusRepository(SimartDbContext db) : IFocusRepository
{
    public async Task AddLockAsync(FocusSession session, CancellationToken cancellationToken)
    {
        db.FocusSessions.Add(session);
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task<FocusSession?> FindActiveLockAsync(Guid childId, DateTimeOffset now, CancellationToken cancellationToken) =>
        db.FocusSessions
            .Where(s => s.ChildId == childId && s.LockedUntil > now)
            .OrderByDescending(s => s.LockedUntil)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<int> AddScreenTimeAsync(Guid childId, DateOnly date, int secondsDelta, CancellationToken cancellationToken)
    {
        var entry = await db.ScreenTimeEntries
            .FirstOrDefaultAsync(e => e.ChildId == childId && e.Date == date, cancellationToken);
        if (entry is null)
        {
            entry = new ScreenTimeEntry { Id = Guid.NewGuid(), ChildId = childId, Date = date, TotalSeconds = 0 };
            db.ScreenTimeEntries.Add(entry);
        }

        entry.TotalSeconds += secondsDelta;
        await db.SaveChangesAsync(cancellationToken);
        return entry.TotalSeconds;
    }

    public async Task<int> GetScreenTimeAsync(Guid childId, DateOnly date, CancellationToken cancellationToken)
    {
        var entry = await db.ScreenTimeEntries
            .FirstOrDefaultAsync(e => e.ChildId == childId && e.Date == date, cancellationToken);
        return entry?.TotalSeconds ?? 0;
    }
}
