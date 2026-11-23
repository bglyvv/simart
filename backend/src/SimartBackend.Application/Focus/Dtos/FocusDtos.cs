using SimartBackend.Domain.Entities.Focus;

namespace SimartBackend.Application.Focus.Dtos;

public sealed record FocusLockDto(Guid Id, Guid ChildId, DateTimeOffset StartedAt, DateTimeOffset LockedUntil, int Minutes, string TriggerReason)
{
    public static FocusLockDto FromDomain(FocusSession session) => new(
        session.Id, session.ChildId, session.StartedAt, session.LockedUntil, session.Minutes, session.TriggerReason);
}

/// <summary>AddScreenTimeCommand/GetScreenTimeQuery's shared response shape —
/// TotalSeconds is always the full running total for that date, not the delta
/// just added.</summary>
public sealed record ScreenTimeDto(DateOnly Date, int TotalSeconds);
