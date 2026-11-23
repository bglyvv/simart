using MediatR;
using SimartBackend.Application.Focus.Dtos;

namespace SimartBackend.Application.Focus.Commands.StartFocusLock;

/// <summary>CallerFamilyId is the token's familyId — same ownership-via-child
/// shape as CompleteHabitTaskCommand, since this route is keyed by childId too.
/// Reason is a short machine tag (e.g. "video_limit"), not shown to the user
/// anywhere yet — kept for the same audit purpose FocusSession.TriggerReason's
/// own doc comment describes ("why" a lock happened).</summary>
public sealed record StartFocusLockCommand(Guid CallerFamilyId, Guid ChildId, int Minutes, string Reason)
    : IRequest<FocusLockDto>;
