using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Social.Commands.UnlikePost;

public sealed class UnlikePostCommandHandler(
    IFamilyAccountRepository familyAccountRepository, ISocialRepository socialRepository)
    : IRequestHandler<UnlikePostCommand>
{
    public async Task Handle(UnlikePostCommand request, CancellationToken cancellationToken)
    {
        await SocialChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var existing = await socialRepository.FindPostLikeAsync(request.ChildId, request.PostId, cancellationToken);
        if (existing is null)
            return;

        await socialRepository.RemovePostLikeAsync(existing, cancellationToken);
    }
}
