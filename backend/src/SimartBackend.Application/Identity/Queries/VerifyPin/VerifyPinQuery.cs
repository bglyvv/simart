using MediatR;

namespace SimartBackend.Application.Identity.Queries.VerifyPin;

/// <summary>CallerParentId comes from the caller's own JWT subject claim — this
/// is always "verify my own PIN," never another parent's, so there's no
/// separate familyId/parentId-in-the-URL ownership check to do (unlike every
/// Habits/Focus/Leagues endpoint keyed by a childId someone else could try to
/// pass in). A plain bool, not an auth boundary by itself — the caller decides
/// what a correct/incorrect answer means (FamilyGatePage unlocks the dashboard;
/// a wrong answer there is just "try again," not a 401).</summary>
public sealed record VerifyPinQuery(Guid CallerParentId, string Pin) : IRequest<bool>;
