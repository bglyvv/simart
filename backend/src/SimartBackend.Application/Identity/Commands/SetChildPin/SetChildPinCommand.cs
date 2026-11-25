using MediatR;

namespace SimartBackend.Application.Identity.Commands.SetChildPin;

/// <summary>A parent administers a child's PIN directly — unlike
/// ChangePinCommand (the parent's own PIN), there's no "current PIN" to
/// verify first, since the point is a parent setting this on the child's
/// behalf, not the child changing their own. NewPin null clears it (back to
/// "no PIN set", i.e. open) — the parent's own way to undo this if a child
/// forgets it or the family decides they don't want the extra step anymore.</summary>
public sealed record SetChildPinCommand(Guid CallerFamilyId, Guid ChildId, string? NewPin) : IRequest;
