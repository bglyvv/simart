using SimartBackend.Domain.Entities.Social;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where posts, likes, and comments in the "Təhlükəsiz Sosial Mühit"
/// feed are read and written. Implemented in Infrastructure against
/// SimartDbContext — Application only ever sees this interface, same pattern
/// as IRewardRepository. Deliberately cross-family: unlike every other
/// repository in this backend, nothing here is scoped to the caller's own
/// family — the feed and leaderboard are shared across every family in the
/// app, same as the original mock data always was.</summary>
public interface ISocialRepository
{
    /// <summary>Most recent posts first, across every family.</summary>
    Task<IReadOnlyList<SocialPost>> GetRecentPostsAsync(int limit, CancellationToken cancellationToken);

    Task<SocialPost?> FindPostAsync(Guid postId, CancellationToken cancellationToken);

    Task AddPostAsync(SocialPost post, CancellationToken cancellationToken);

    /// <summary>Persists a mutation made to an already-tracked post (currently
    /// only ApprovalStatus) — same "fetch, mutate, call Update" shape
    /// ApproveRewardRedemptionCommandHandler already uses.</summary>
    Task UpdatePostAsync(SocialPost post, CancellationToken cancellationToken);

    /// <summary>Number of likes per post, for exactly the given postIds — the
    /// feed's batch way of attaching LikeCount without an N+1.</summary>
    Task<IReadOnlyDictionary<Guid, int>> GetLikeCountsAsync(IReadOnlyList<Guid> postIds, CancellationToken cancellationToken);

    /// <summary>Number of (top-level + reply) comments per post, for exactly
    /// the given postIds — same batch shape as GetLikeCountsAsync.</summary>
    Task<IReadOnlyDictionary<Guid, int>> GetCommentCountsAsync(IReadOnlyList<Guid> postIds, CancellationToken cancellationToken);

    /// <summary>Which of the given postIds this one child has already liked —
    /// GetPostsQuery's batch way of attaching LikedByMe.</summary>
    Task<IReadOnlySet<Guid>> GetLikedPostIdsAsync(Guid childId, IReadOnlyList<Guid> postIds, CancellationToken cancellationToken);

    Task<PostLike?> FindPostLikeAsync(Guid childId, Guid postId, CancellationToken cancellationToken);

    Task AddPostLikeAsync(PostLike like, CancellationToken cancellationToken);

    Task RemovePostLikeAsync(PostLike like, CancellationToken cancellationToken);

    /// <summary>Every comment (top-level and replies alike) on one post,
    /// oldest first, with Child loaded for AvatarEmoji.</summary>
    Task<IReadOnlyList<SocialComment>> GetCommentsForPostAsync(Guid postId, CancellationToken cancellationToken);

    Task<SocialComment?> FindCommentAsync(Guid commentId, CancellationToken cancellationToken);

    Task AddCommentAsync(SocialComment comment, CancellationToken cancellationToken);
}
