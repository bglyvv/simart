using SimartBackend.Domain.Entities.Focus;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where FocusSession (the "video limit reached" lock) is read and
/// written. Implemented in Infrastructure against SimartDbContext — Application
/// only ever sees this interface, same pattern as IHabitCatalogRepository.</summary>
public interface IFocusRepository
{
    Task AddLockAsync(FocusSession session, CancellationToken cancellationToken);

    /// <summary>The most recent still-active lock for this child (LockedUntil in
    /// the future, relative to `now`) — null if there isn't one. A child can only
    /// ever be under one lock at a time in practice, but "most recent" is used
    /// defensively rather than assuming exactly zero-or-one rows.</summary>
    Task<FocusSession?> FindActiveLockAsync(Guid childId, DateTimeOffset now, CancellationToken cancellationToken);

    /// <summary>Adds secondsDelta to this child's cumulative screen time for the
    /// given date — creates the ScreenTimeEntry row on the first call for that
    /// (child, date) pair. Returns the new running total. Always a positive
    /// increment (never a correction/decrement) — AddScreenTimeCommandHandler is
    /// what actually enforces that, this just applies it.</summary>
    Task<int> AddScreenTimeAsync(Guid childId, DateOnly date, int secondsDelta, CancellationToken cancellationToken);

    /// <summary>This child's cumulative screen time for the given date — 0 if no
    /// row exists yet (nothing watched that day).</summary>
    Task<int> GetScreenTimeAsync(Guid childId, DateOnly date, CancellationToken cancellationToken);
}
