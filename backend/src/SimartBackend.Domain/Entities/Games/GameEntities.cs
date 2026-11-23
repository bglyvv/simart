using SimartBackend.Domain.Common;
using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Domain.Entities.Games;

/// <summary>The six mini-games, each tagged with a cognitive axis.</summary>
public class Game : ISoftDeletable
{
    public Guid Id { get; set; }
    public required string Slug { get; set; }
    public required string Title { get; set; }
    public required string Icon { get; set; }
    public required string Axis { get; set; }

    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
}

/// <summary>One row per play; feeds the parent dashboard's radar chart.</summary>
public class GameResult
{
    public Guid Id { get; set; }
    public Guid ChildId { get; set; }
    public Guid GameId { get; set; }
    public int Score { get; set; }
    public DateTimeOffset PlayedAt { get; set; }

    public Child Child { get; set; } = null!;
    public Game Game { get; set; } = null!;
}
