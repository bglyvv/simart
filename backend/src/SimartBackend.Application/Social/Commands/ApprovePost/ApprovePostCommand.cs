using MediatR;

namespace SimartBackend.Application.Social.Commands.ApprovePost;

/// <summary>Flips a pending post to approved — the parent-approval half of
/// the real moderation flow (see "Social" in backend/README.md). No reject
/// endpoint: the README only asked for an approve action, not an "unapprove"
/// or "reject" one, so none is invented here.</summary>
public sealed record ApprovePostCommand(Guid CallerFamilyId, Guid PostId) : IRequest;
