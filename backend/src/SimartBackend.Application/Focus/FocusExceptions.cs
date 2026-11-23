namespace SimartBackend.Application.Focus;

/// <summary>Thrown by the focus-lock handlers when the given childId doesn't
/// exist — mapped to 404. Same split-purpose as HabitChildNotFoundException:
/// about resolving which family owns a child for the ownership check, not about
/// family existence itself.</summary>
public sealed class FocusChildNotFoundException(Guid childId)
    : Exception($"Child '{childId}' was not found.");

/// <summary>Thrown by the focus-lock handlers when the caller's token family
/// doesn't own the given child — mapped to 403, same "can't write into another
/// family" rule as HabitAccessDeniedException.</summary>
public sealed class FocusAccessDeniedException()
    : Exception("This child does not belong to your family.");

/// <summary>Thrown by StartFocusLockCommandHandler when Minutes falls outside
/// FocusLockLimits' sane range — mapped to 400. Defense in depth: the frontend
/// only ever sends a fixed value (15), but nothing stops a direct API call from
/// sending something absurd.</summary>
public sealed class InvalidFocusLockMinutesException(int minutes)
    : Exception($"Lock duration {minutes} minutes is outside the allowed range " +
        $"({FocusLockLimits.MinMinutes}-{FocusLockLimits.MaxMinutes}).");

/// <summary>Thrown by AddScreenTimeCommandHandler when SecondsDelta is zero,
/// negative, or above ScreenTimeLimits.MaxDeltaSeconds — mapped to 400. The
/// frontend only ever flushes a small positive real-elapsed-time delta every
/// few seconds; this is the defense-in-depth cap against a buggy or malicious
/// direct API call reporting hours of "watch time" in one call.</summary>
public sealed class InvalidScreenTimeDeltaException(int secondsDelta)
    : Exception($"Screen time delta {secondsDelta} seconds is outside the allowed range " +
        $"(1-{ScreenTimeLimits.MaxDeltaSeconds}).");
