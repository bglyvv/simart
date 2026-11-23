using MediatR;
using SimartBackend.Application.Social.Dtos;

namespace SimartBackend.Application.Social.Commands.CreateComment;

public sealed record CreateCommentCommand(
    Guid CallerFamilyId, Guid ChildId, Guid PostId, string Body, Guid? ParentCommentId)
    : IRequest<SocialCommentDto>;
