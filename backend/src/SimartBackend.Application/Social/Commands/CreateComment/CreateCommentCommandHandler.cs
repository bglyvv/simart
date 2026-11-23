using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Social.Dtos;
using SimartBackend.Domain.Entities.Social;

namespace SimartBackend.Application.Social.Commands.CreateComment;

public sealed class CreateCommentCommandHandler(
    IFamilyAccountRepository familyAccountRepository, ISocialRepository socialRepository)
    : IRequestHandler<CreateCommentCommand, SocialCommentDto>
{
    public async Task<SocialCommentDto> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        await SocialChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var body = request.Body.Trim();
        if (body.Length == 0 || body.Length > SocialLimits.MaxCommentLength)
            throw new SocialCommentInvalidException(SocialLimits.MaxCommentLength);

        if (await socialRepository.FindPostAsync(request.PostId, cancellationToken) is null)
            throw new SocialPostNotFoundException(request.PostId);

        if (request.ParentCommentId is { } parentId)
        {
            var parent = await socialRepository.FindCommentAsync(parentId, cancellationToken);
            if (parent is null || parent.PostId != request.PostId)
                throw new SocialParentCommentMismatchException(parentId);
        }

        var siblings = await familyAccountRepository.GetChildrenAsync(request.CallerFamilyId, cancellationToken);
        var child = siblings.First(c => c.Id == request.ChildId);

        var comment = new SocialComment
        {
            Id = Guid.NewGuid(),
            PostId = request.PostId,
            ChildId = request.ChildId,
            ParentCommentId = request.ParentCommentId,
            Body = body,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        await socialRepository.AddCommentAsync(comment, cancellationToken);

        return new SocialCommentDto(
            comment.Id, comment.PostId, comment.ChildId, SocialHandle.Generate(comment.ChildId), child.AvatarEmoji,
            comment.Body, comment.ParentCommentId, comment.CreatedAt);
    }
}
