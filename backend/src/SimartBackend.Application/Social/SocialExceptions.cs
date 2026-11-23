namespace SimartBackend.Application.Social;

public sealed class SocialChildNotFoundException(Guid childId)
    : Exception($"Child '{childId}' was not found.");

public sealed class SocialAccessDeniedException()
    : Exception("This child does not belong to your family.");

public sealed class SocialPostNotFoundException(Guid postId)
    : Exception($"Post '{postId}' was not found.");

/// <summary>Thrown when a comment's ParentCommentId doesn't belong to the same
/// PostId it's being added under — mapped to 400. Prevents a reply from
/// pointing at a comment on a completely different post.</summary>
public sealed class SocialParentCommentMismatchException(Guid parentCommentId)
    : Exception($"Comment '{parentCommentId}' does not belong to this post.");

public sealed class SocialCaptionInvalidException(int maxLength)
    : Exception($"Caption must be 1-{maxLength} characters.");

public sealed class SocialCommentInvalidException(int maxLength)
    : Exception($"Comment must be 1-{maxLength} characters.");
