using MediatR;

namespace SimartBackend.Application.Identity.Queries.VerifyChildPin;

/// <summary>CallerFamilyId comes from the caller's own JWT familyId claim — the
/// current session's own family, which must own ChildId (any family member can
/// check this, not just the parent persona — a child picking a sibling's
/// profile from the gate/switcher is exactly who calls this). Returns true,
/// not just "correct," when the child has no PIN set at all (Child.PinHash is
/// null) — an unprotected child profile has nothing to verify against, and the
/// frontend already decides whether to even prompt for a PIN from ChildDto's
/// own HasPin flag; this mirrors that same "no PIN set" = "open" rule
/// server-side, in case the two ever disagree.</summary>
public sealed record VerifyChildPinQuery(Guid CallerFamilyId, Guid ChildId, string Pin) : IRequest<bool>;
