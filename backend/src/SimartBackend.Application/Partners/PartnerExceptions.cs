namespace SimartBackend.Application.Partners;

/// <summary>Thrown by LoginPartnerCommandHandler on a wrong email/password —
/// mapped to 401. Same "don't let a caller enumerate accounts" reasoning as
/// Identity/Admin's own InvalidCredentialsException.</summary>
public sealed class InvalidPartnerCredentialsException() : Exception("Incorrect email or password.");

/// <summary>Thrown when a voucher code doesn't match any row — mapped to
/// 404. A partner mistyping a code (manual entry) is the expected case
/// here, not a bug.</summary>
public sealed class VoucherNotFoundException(string code)
    : Exception($"Voucher '{code}' was not found.");

/// <summary>Thrown when the caller's own partnerId doesn't match the
/// voucher's PartnerId — mapped to 403. A partner can only ever see/fulfill
/// vouchers tied to their own Rewards/DonationCampaigns, never another
/// partner's.</summary>
public sealed class VoucherAccessDeniedException()
    : Exception("This voucher does not belong to your account.");

/// <summary>Thrown by FulfillVoucherCommandHandler when the voucher's Status
/// is already "fulfilled" — mapped to 409. A voucher can only be collected
/// once.</summary>
public sealed class VoucherAlreadyFulfilledException(string code)
    : Exception($"Voucher '{code}' has already been fulfilled.");

/// <summary>Thrown by FulfillVoucherCommandHandler for a reward-sourced
/// voucher whose underlying RewardRedemption isn't "approved" yet — mapped
/// to 409. A partner can't hand over a reward a parent hasn't actually
/// approved (still "pending") or has turned down ("rejected"); a
/// donation-sourced voucher has no such gate, since Donate is always
/// instant/confirmed.</summary>
public sealed class VoucherNotYetApprovedException(string code)
    : Exception($"Voucher '{code}' is for a redemption that hasn't been approved by a parent yet.");

/// <summary>Thrown when a proposalId doesn't match any row — mapped to 404.</summary>
public sealed class RewardProposalNotFoundException(Guid proposalId)
    : Exception($"Reward proposal '{proposalId}' was not found.");

/// <summary>Thrown when the caller's own partnerId doesn't match the
/// proposal's PartnerId — mapped to 403. A partner can only ever see/act on
/// their own proposals, never another partner's.</summary>
public sealed class RewardProposalAccessDeniedException()
    : Exception("This reward proposal does not belong to your account.");

/// <summary>Thrown when an action is attempted against a proposal in the
/// wrong status — mapped to 409. E.g. a partner trying to approve/reject a
/// proposal that isn't currently "admin_edited_pending_partner", or an
/// admin trying to accept/edit one that's already "approved" or
/// "declined_by_admin" (both terminal).</summary>
public sealed class InvalidRewardProposalStatusException(string actualStatus, string expectedStatus)
    : Exception($"This action requires status '{expectedStatus}', but the proposal is '{actualStatus}'.");

/// <summary>Thrown by Submit/AdminEditRewardProposalCommandHandler when
/// CostXp falls outside RewardProposalLimits' sane range, or Title is
/// blank — mapped to 400.</summary>
public sealed class InvalidRewardProposalFieldsException(string message) : Exception(message);
