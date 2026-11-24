using MediatR;

namespace SimartBackend.Application.Identity.Commands.ChangePin;

/// <summary>CallerParentId comes from the caller's own JWT subject claim, same
/// reasoning as VerifyPinQuery — always "change my own PIN." Requires the
/// current PIN (verified against the stored hash before anything is written)
/// so a change can't happen just because a request is bearer-authed; the
/// bearer token alone proves "this session is this parent," not "this parent
/// currently knows the PIN," which is the actual thing worth re-checking here.</summary>
public sealed record ChangePinCommand(Guid CallerParentId, string CurrentPin, string NewPin) : IRequest;
