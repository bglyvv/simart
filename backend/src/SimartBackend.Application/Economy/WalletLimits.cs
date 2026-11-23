namespace SimartBackend.Application.Economy;

/// <summary>Defense-in-depth bounds on a single GrantAllowanceCommand — same
/// numeric-cap pattern as FocusLockLimits/ScreenTimeLimits/FamilyHabitLimits.
/// A parent is trusted to grant their own child pocket money, but not to send
/// a zero/negative or absurdly large amount through a direct API call.</summary>
public static class WalletLimits
{
    public const decimal MinGrantAzn = 0.01m;
    public const decimal MaxGrantAzn = 500m;
}
