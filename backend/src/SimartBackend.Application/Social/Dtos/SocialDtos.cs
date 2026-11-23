using SimartBackend.Domain.Entities.Social;

namespace SimartBackend.Application.Social.Dtos;

public sealed record SocialPostDto(
    Guid Id, Guid ChildId, string Handle, string AvatarEmoji, string Caption, string? MediaEmoji,
    DateTimeOffset CreatedAt, int LikeCount, int CommentCount, bool LikedByMe)
{
    public static SocialPostDto FromDomain(SocialPost post, int likeCount, int commentCount, bool likedByMe) => new(
        post.Id, post.ChildId, post.Handle, post.AvatarEmoji, post.Caption, post.MediaEmoji,
        post.CreatedAt, likeCount, commentCount, likedByMe);
}

public sealed record SocialCommentDto(
    Guid Id, Guid PostId, Guid ChildId, string Handle, string AvatarEmoji, string Body,
    Guid? ParentCommentId, DateTimeOffset CreatedAt);

public sealed record LeaderboardEntryDto(Guid ChildId, string Handle, string AvatarEmoji, int TotalXp);
