using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Social;

namespace SimartBackend.Application.Social.Commands.LikePost;

public sealed class LikePostCommandHandler(
    IFamilyAccountRepository familyAccountRepository, ISocialRepository socialRepository)
    : IRequestHandler<LikePostCommand>
{
    public async Task Handle(LikePostCommand request, CancellationToken cancellationToken)
    {
        await SocialChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        if (await socialRepository.FindPostAsync(request.PostId, cancellationToken) is null)
            throw new SocialPostNotFoundException(request.PostId);

        // Idempotent — liking an already-liked post is a silent no-op, same
        // shape as CompleteHabitTaskCommand.
        if (await socialRepository.FindPostLikeAsync(request.ChildId, request.PostId, cancellationToken) is not null)
            return;

        await socialRepository.AddPostLikeAsync(new PostLike
        {
            Id = Guid.NewGuid(),
            ChildId = request.ChildId,
            PostId = request.PostId,
            CreatedAt = DateTimeOffset.UtcNow,
        }, cancellationToken);
    }
}
