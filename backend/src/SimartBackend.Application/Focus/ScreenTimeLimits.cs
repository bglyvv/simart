namespace SimartBackend.Application.Focus;

/// <summary>Server-side bound on a single screen-time flush — the frontend only
/// ever flushes a small real-elapsed-time delta every ~10 seconds while a video
/// is actually playing, but this is the real enforcement, same role
/// FocusLockLimits plays for lock duration.</summary>
public static class ScreenTimeLimits
{
    public const int MaxDeltaSeconds = 300;
}
