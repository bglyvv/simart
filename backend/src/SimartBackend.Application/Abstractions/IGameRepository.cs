using SimartBackend.Domain.Entities.Games;

namespace SimartBackend.Application.Abstractions;

/// <summary>Where the game catalog (the six mini-games, seeded idempotently at
/// startup — see Program.cs, same "no admin management UI yet" shape as
/// IRewardRepository's reward catalog) and a child's play history are read and
/// written. Implemented in Infrastructure against SimartDbContext — Application
/// only ever sees this interface, same pattern as every other repository here.</summary>
public interface IGameRepository
{
    /// <summary>Resolves the frontend's slug (GAME_CATALOG's id, e.g. "memory")
    /// to the real Game row — RecordGamePlayCommand's boundary lookup, same
    /// "never surface the internal Guid" shape as playlist/video public ids.</summary>
    Task<Game?> FindGameBySlugAsync(string slug, CancellationToken cancellationToken);

    Task AddResultAsync(GameResult result, CancellationToken cancellationToken);

    /// <summary>This child's most recent plays, newest first, with `Game` already
    /// loaded (GetGamePlaysQuery needs its Slug/Axis, not just the internal
    /// GameId) — GamesPage.tsx's play history / stats.</summary>
    Task<IReadOnlyList<GameResult>> GetRecentResultsForChildAsync(
        Guid childId, int limit, CancellationToken cancellationToken);
}
