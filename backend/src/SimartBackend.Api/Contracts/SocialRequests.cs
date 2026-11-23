namespace SimartBackend.Api.Contracts;

public sealed record CreatePostRequest(string Caption, string? MediaEmoji);

public sealed record CreateCommentRequest(string Body, Guid? ParentCommentId);
