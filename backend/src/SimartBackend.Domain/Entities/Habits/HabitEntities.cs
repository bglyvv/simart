using SimartBackend.Domain.Common;
using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Domain.Entities.Habits;

/// <summary>Fiziki / Zehni / Sosial — shared across families.</summary>
public class HabitCategory : ISoftDeletable
{
    public Guid Id { get; set; }
    public required string Key { get; set; }
    public required string Title { get; set; }
    public required string Icon { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }

    public ICollection<HabitTask> Tasks { get; set; } = new List<HabitTask>();
}

/// <summary>The catalog of trackable tasks per category.</summary>
public class HabitTask : ISoftDeletable
{
    public Guid Id { get; set; }
    public Guid CategoryId { get; set; }
    public required string Title { get; set; }
    public string? Note { get; set; }
    public int XpValue { get; set; }

    /// <summary>Null for the shared admin catalog (visible to every family). Set when
    /// a parent created this task for their own family — then it's only visible to,
    /// and completable by, that family's children. No navigation property: nothing
    /// here ever needs to load the Family from a task, just filter by this id (see
    /// GetHabitCategoriesQueryHandler), so there's no FK/cascade to reason about.</summary>
    public Guid? FamilyId { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }

    public HabitCategory Category { get; set; } = null!;
}

/// <summary>One row per child, per task, per day.</summary>
public class HabitCompletion
{
    public Guid Id { get; set; }
    public Guid ChildId { get; set; }
    public Guid TaskId { get; set; }
    public DateOnly LogDate { get; set; }
    public DateTimeOffset CompletedAt { get; set; }

    public Child Child { get; set; } = null!;
    public HabitTask Task { get; set; } = null!;
}

/// <summary>Restricts a family-created HabitTask (FamilyId set) to specific
/// children in that family — a parent picks exactly which of their children
/// receive a new custom habit, rather than it silently going to all of them.
/// Only ever written for family-created tasks; the shared admin catalog
/// (FamilyId null) never has rows here and stays universally visible. A task
/// with zero rows here (only possible for something that predates this table
/// — see the AddFamilyIdToHabitTaskAssignments migration's backfill) is
/// treated as "visible to every family child," not "visible to none" — see
/// HabitCategoryDto.FromDomainForChild.</summary>
public class HabitTaskAssignment
{
    public Guid TaskId { get; set; }
    public Guid ChildId { get; set; }

    public HabitTask Task { get; set; } = null!;
    public Child Child { get; set; } = null!;
}
