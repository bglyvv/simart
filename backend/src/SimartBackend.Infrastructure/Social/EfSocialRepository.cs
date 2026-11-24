using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Social;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure.Social;

public sealed class EfSocialRepository(SimartDbContext db) : ISocialRepository
{
    public async Task<IReadOnlyList<SocialPost>> GetRecentPostsAsync(int limit, CancellationToken cancellationToken) =>
        await db.SocialPosts
            .OrderByDescending(p => p.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);

    public Task<SocialPost?> FindPostAsync(Guid postId, CancellationToken cancellationToken) =>
        db.SocialPosts.FirstOrDefaultAsync(p => p.Id == postId, cancellationToken);

    public async Task AddPostAsync(SocialPost post, CancellationToken cancellationToken)
    {
        db.SocialPosts.Add(post);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdatePostAsync(SocialPost post, CancellationToken cancellationToken)
    {
        db.SocialPosts.Update(post);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<Guid, int>> GetLikeCountsAsync(
        IReadOnlyList<Guid> postIds, CancellationToken cancellationToken) =>
        await db.PostLikes
            .Where(l => postIds.Contains(l.PostId))
            .GroupBy(l => l.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count, cancellationToken);

    public async Task<IReadOnlyDictionary<Guid, int>> GetCommentCountsAsync(
        IReadOnlyList<Guid> postIds, CancellationToken cancellationToken) =>
        await db.SocialComments
            .Where(c => postIds.Contains(c.PostId))
            .GroupBy(c => c.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count, cancellationToken);

    public async Task<IReadOnlySet<Guid>> GetLikedPostIdsAsync(
        Guid childId, IReadOnlyList<Guid> postIds, CancellationToken cancellationToken) =>
        (await db.PostLikes
            .Where(l => l.ChildId == childId && postIds.Contains(l.PostId))
            .Select(l => l.PostId)
            .ToListAsync(cancellationToken))
        .ToHashSet();

    public Task<PostLike?> FindPostLikeAsync(Guid childId, Guid postId, CancellationToken cancellationToken) =>
        db.PostLikes.FirstOrDefaultAsync(l => l.ChildId == childId && l.PostId == postId, cancellationToken);

    public async Task AddPostLikeAsync(PostLike like, CancellationToken cancellationToken)
    {
        db.PostLikes.Add(like);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task RemovePostLikeAsync(PostLike like, CancellationToken cancellationToken)
    {
        db.PostLikes.Remove(like);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SocialComment>> GetCommentsForPostAsync(Guid postId, CancellationToken cancellationToken) =>
        await db.SocialComments
            .Include(c => c.Child)
            .Where(c => c.PostId == postId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<SocialComment?> FindCommentAsync(Guid commentId, CancellationToken cancellationToken) =>
        db.SocialComments.FirstOrDefaultAsync(c => c.Id == commentId, cancellationToken);

    public async Task AddCommentAsync(SocialComment comment, CancellationToken cancellationToken)
    {
        db.SocialComments.Add(comment);
        await db.SaveChangesAsync(cancellationToken);
    }
}
