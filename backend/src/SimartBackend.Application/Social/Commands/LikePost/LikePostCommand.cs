using MediatR;

namespace SimartBackend.Application.Social.Commands.LikePost;

public sealed record LikePostCommand(Guid CallerFamilyId, Guid ChildId, Guid PostId) : IRequest;
