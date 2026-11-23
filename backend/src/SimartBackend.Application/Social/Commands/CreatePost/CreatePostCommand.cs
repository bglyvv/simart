using MediatR;
using SimartBackend.Application.Social.Dtos;

namespace SimartBackend.Application.Social.Commands.CreatePost;

public sealed record CreatePostCommand(Guid CallerFamilyId, Guid ChildId, string Caption, string? MediaEmoji)
    : IRequest<SocialPostDto>;
