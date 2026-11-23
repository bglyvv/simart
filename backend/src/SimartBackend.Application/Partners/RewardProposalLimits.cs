namespace SimartBackend.Application.Partners;

/// <summary>Defense-in-depth bounds on a proposal's CostXp — same numeric-
/// cap pattern as WalletLimits/FocusLockLimits/FamilyHabitLimits. A partner
/// is trusted to propose a real reward, but not to set an absurd (zero,
/// negative, or implausibly huge) XP cost through a direct API call.</summary>
public static class RewardProposalLimits
{
    public const int MinCostXp = 1;
    public const int MaxCostXp = 5000;
}
