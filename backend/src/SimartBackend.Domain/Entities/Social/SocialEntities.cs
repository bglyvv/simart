using SimartBackend.Domain.Common;
using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Domain.Entities.Social;

/// <summary>Posted under an anonymized handle, never the child's name.</summary>
public class SocialPost : ISoftDeletable
{
    public Guid Id { get; set; }
    public Guid ChildId { get; set; }
    public required string Handle { get; set; }
    public required string AvatarEmoji { get; set; }
    public required string Caption { get; set; }
    public string? MediaEmoji { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>"pending" until a parent approves it (see "Social" in
    /// backend/README.md) — SocialApprovalStatus holds the two valid values.
    /// Defaulted to "approved" at the column level (migration
    /// AddApprovalStatusToSocialPost) so every pre-existing real post stays
    /// visible exactly as before; CreatePostCommandHandler explicitly writes
    /// "pending" for every new post going forward, overriding that default.</summary>
    public required string ApprovalStatus { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }

    public Child Child { get; set; } = null!;
    public ICollection<SocialComment> Comments { get; set; } = new List<SocialComment>();
    public ICollection<PostLike> Likes { get; set; } = new List<PostLike>();
}

public class PostLike
{
    public Guid Id { get; set; }
    public Guid ChildId { get; set; }
    public Guid PostId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Child Child { get; set; } = null!;
    public SocialPost Post { get; set; } = null!;
}

/// <summary>Threaded: <see cref="ParentCommentId"/> points at the comment this is
/// replying to — null for a top-level comment.</summary>
public class SocialComment : ISoftDeletable
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid ChildId { get; set; }
    public Guid? ParentCommentId { get; set; }
    public required string Body { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }

    public SocialPost Post { get; set; } = null!;
    public Child Child { get; set; } = null!;
    public SocialComment? ParentComment { get; set; }
    public ICollection<SocialComment> Replies { get; set; } = new List<SocialComment>();
    public ICollection<CommentLike> Likes { get; set; } = new List<CommentLike>();
}

public class CommentLike
{
    public Guid Id { get; set; }
    public Guid ChildId { get; set; }
    public Guid CommentId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Child Child { get; set; } = null!;
    public SocialComment Comment { get; set; } = null!;
}
