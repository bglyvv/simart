namespace SimartBackend.Application.Identity;

/// <summary>Thrown by SignUpFamilyCommandHandler — a business-rule failure, not a bug,
/// so the Api endpoint catches this specifically and maps it to 409 Conflict instead
/// of letting it fall through as a 500.</summary>
public sealed class EmailAlreadyUsedException(string email)
    : Exception($"Email '{email}' is already registered.");

/// <summary>Thrown by AddChildCommandHandler when the given familyId doesn't exist —
/// mapped to 404 by the Api endpoint.</summary>
public sealed class FamilyNotFoundException(Guid familyId)
    : Exception($"Family '{familyId}' was not found.");

/// <summary>Thrown by LoginFamilyCommandHandler on a wrong email/password — mapped to
/// 401 by the Api endpoint. Deliberately the same message for "no such email" and
/// "wrong password" so a caller can't use this endpoint to enumerate registered
/// emails.</summary>
public sealed class InvalidCredentialsException() : Exception("Incorrect email or password.");

/// <summary>Thrown by ResetPasswordCommandHandler when the token doesn't match any
/// row, is already used, or has expired — mapped to 400 by the Api endpoint.
/// Deliberately the same message for all three cases, same anti-enumeration shape
/// InvalidCredentialsException already uses — a caller can't tell "never existed"
/// from "already used" from "expired".</summary>
public sealed class InvalidResetTokenException() : Exception("This reset link is invalid or has expired.");

/// <summary>Thrown by UpdateParentCommandHandler (admin edit) when parentId
/// doesn't exist or is currently deactivated — mapped to 404. DeactivateFamily/
/// ReactivateFamilyCommandHandler reuse FamilyNotFoundException itself (same
/// "nothing to act on here" 404) rather than a dedicated type.</summary>
public sealed class ParentNotFoundException(Guid parentId)
    : Exception($"Parent '{parentId}' was not found.");

/// <summary>Thrown by UpdateChildCommandHandler (admin edit) when childId
/// doesn't exist or is currently deactivated — mapped to 404. Named
/// "ChildAccount", not "Child", to avoid any ambiguity with the per-domain
/// ChildNotFoundException types (Habits/Focus/Social/Leagues) also in scope
/// wherever Program.cs imports several of these namespaces at once.</summary>
public sealed class ChildAccountNotFoundException(Guid childId)
    : Exception($"Child '{childId}' was not found.");

/// <summary>Thrown by UpdateParentCommandHandler when the given FullName is
/// blank after trimming — mapped to 400.</summary>
public sealed class InvalidParentNameException() : Exception("Full name is required.");

/// <summary>Thrown by UpdateChildCommandHandler when Name or City is blank after
/// trimming — mapped to 400.</summary>
public sealed class InvalidChildInfoException() : Exception("Name and city are required.");

/// <summary>Thrown by ChangePinCommandHandler when the supplied current PIN
/// doesn't match the stored hash — mapped to 400. Kept distinct from the format
/// check below so the frontend can show "wrong PIN" vs. "PIN must be 4 digits"
/// as separate, correctly-worded messages.</summary>
public sealed class IncorrectPinException() : Exception("Incorrect current PIN.");

/// <summary>Thrown by ChangePinCommandHandler when the new PIN isn't exactly 4
/// digits — mapped to 400. SignUpFamilyCommandHandler never enforced this
/// server-side (it just hashed whatever string arrived); this is the first
/// place the 4-digit rule is actually checked on the backend.</summary>
public sealed class InvalidPinFormatException() : Exception("PIN must be exactly 4 digits.");

/// <summary>Thrown by VerifyChildPinQueryHandler/SetChildPinCommandHandler when
/// the caller's own family doesn't own the given childId — mapped to 403.
/// Named "ChildAccount", not "Child", for the same ambiguity reason
/// ChildAccountNotFoundException already is.</summary>
public sealed class ChildAccountAccessDeniedException() : Exception("This child does not belong to your family.");
