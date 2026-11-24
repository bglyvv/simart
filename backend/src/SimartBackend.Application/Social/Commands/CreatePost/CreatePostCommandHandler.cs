using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Social.Dtos;
using SimartBackend.Domain.Entities.Social;

namespace SimartBackend.Application.Social.Commands.CreatePost;

public sealed class CreatePostCommandHandler(
    IFamilyAccountRepository familyAccountRepository, ISocialRepository socialRepository)
    : IRequestHandler<CreatePostCommand, SocialPostDto>
{
    public async Task<SocialPostDto> Handle(CreatePostCommand request, CancellationToken cancellationToken)
    {
        await SocialChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var caption = request.Caption.Trim();
        if (caption.Length == 0 || caption.Length > SocialLimits.MaxCaptionLength)
            throw new SocialCaptionInvalidException(SocialLimits.MaxCaptionLength);

        // Ownership already confirmed the child is in this family — reuse the
        // family's own child list rather than adding a single-child lookup
        // method just for this one AvatarEmoji read.
        var siblings = await familyAccountRepository.GetChildrenAsync(request.CallerFamilyId, cancellationToken);
        var child = siblings.First(c => c.Id == request.ChildId);

        var post = new SocialPost
        {
            Id = Guid.NewGuid(),
            ChildId = request.ChildId,
            Handle = SocialHandle.Generate(request.ChildId),
            AvatarEmoji = child.AvatarEmoji,
            Caption = caption,
            MediaEmoji = request.MediaEmoji,
            CreatedAt = DateTimeOffset.UtcNow,
            // Every new post starts pending — a parent approves it via
            // POST /api/social/posts/{postId}/approve before it's meant to be
            // treated as live. The column itself defaults to "approved" (see
            // ApprovalStatus's doc comment) purely so pre-existing rows from
            // before this feature backfill correctly; this write always
            // overrides that default for anything created from here on.
            ApprovalStatus = SocialApprovalStatus.Pending,
        };
        await socialRepository.AddPostAsync(post, cancellationToken);

        return SocialPostDto.FromDomain(post, likeCount: 0, commentCount: 0, likedByMe: false);
    }
}
