using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Domain.Entities.Focus;

/// <summary>One row per lock: when it started, until when, why.</summary>
public class FocusSession
{
    public Guid Id { get; set; }
    public Guid ChildId { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset LockedUntil { get; set; }
    public int Minutes { get; set; }
    public required string TriggerReason { get; set; }

    public Child Child { get; set; } = null!;
}
