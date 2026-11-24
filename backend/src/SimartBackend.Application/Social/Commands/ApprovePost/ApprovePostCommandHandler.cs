using MediatR;
using SimartBackend.Application.Abstractions;

namespace SimartBackend.Application.Social.Commands.ApprovePost;

public sealed class ApprovePostCommandHandler(
    IFamilyAccountRepository familyAccountRepository, ISocialRepository socialRepository)
    : IRequestHandler<ApprovePostCommand>
{
    public async Task Handle(ApprovePostCommand request, CancellationToken cancellationToken)
    {
        var post = await socialRepository.FindPostAsync(request.PostId, cancellationToken)
            ?? throw new SocialPostNotFoundException(request.PostId);

        await SocialChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, post.ChildId, cancellationToken);

        // Idempotent — approving an already-approved post is a silent no-op,
        // same shape as LikePostCommandHandler.
        if (post.ApprovalStatus == SocialApprovalStatus.Approved)
            return;

        post.ApprovalStatus = SocialApprovalStatus.Approved;
        await socialRepository.UpdatePostAsync(post, cancellationToken);
    }
}
