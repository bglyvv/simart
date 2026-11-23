using MediatR;

namespace SimartBackend.Application.Social.Commands.UnlikePost;

public sealed record UnlikePostCommand(Guid CallerFamilyId, Guid ChildId, Guid PostId) : IRequest;
