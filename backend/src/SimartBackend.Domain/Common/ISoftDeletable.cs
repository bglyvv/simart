namespace SimartBackend.Domain.Common;

/// <summary>Marks an entity as moderated/deliberately-removable rather than
/// hard-deleted. See the ER diagram's design notes for which tables get this
/// and why (catalog + user-content tables, not logs, ledgers, or likes).</summary>
public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTimeOffset? DeletedAt { get; set; }
    Guid? DeletedBy { get; set; }
}
