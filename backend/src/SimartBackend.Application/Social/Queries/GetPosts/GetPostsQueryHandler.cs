using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Social.Dtos;

namespace SimartBackend.Application.Social.Queries.GetPosts;

public sealed class GetPostsQueryHandler(
    IFamilyAccountRepository familyAccountRepository, ISocialRepository socialRepository)
    : IRequestHandler<GetPostsQuery, IReadOnlyList<SocialPostDto>>
{
    public async Task<IReadOnlyList<SocialPostDto>> Handle(GetPostsQuery request, CancellationToken cancellationToken)
    {
        await SocialChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var posts = await socialRepository.GetRecentPostsAsync(request.Limit, cancellationToken);
        var postIds = posts.Select(p => p.Id).ToList();

        var likeCounts = await socialRepository.GetLikeCountsAsync(postIds, cancellationToken);
        var commentCounts = await socialRepository.GetCommentCountsAsync(postIds, cancellationToken);
        var likedByMe = await socialRepository.GetLikedPostIdsAsync(request.ChildId, postIds, cancellationToken);

        return posts
            .Select(p => SocialPostDto.FromDomain(
                p,
                likeCounts.GetValueOrDefault(p.Id),
                commentCounts.GetValueOrDefault(p.Id),
                likedByMe.Contains(p.Id)))
            .ToList();
    }
}
