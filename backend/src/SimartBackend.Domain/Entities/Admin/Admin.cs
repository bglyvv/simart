using SimartBackend.Domain.Common;

namespace SimartBackend.Domain.Entities.Admin;

/// <summary>Platform staff — the playlist→audience mapping, moderation of reported
/// posts/comments. Not a parent: no family, no PIN.</summary>
public class Admin : ISoftDeletable
{
    public Guid Id { get; set; }
    public required string FullName { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
}
