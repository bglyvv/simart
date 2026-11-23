namespace SimartBackend.Application.Focus;

/// <summary>Server-side bounds on a focus lock's duration — the frontend only
/// ever requests MinMinutes..MaxMinutes via a fixed value, but these are the
/// real enforcement, same role FamilyHabitLimits plays for custom habits.</summary>
public static class FocusLockLimits
{
    public const int MinMinutes = 1;
    public const int MaxMinutes = 180;
}
