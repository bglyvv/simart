using Microsoft.EntityFrameworkCore;
using SimartBackend.Application.Abstractions;
using SimartBackend.Domain.Entities.Games;
using SimartBackend.Infrastructure.Persistence;

namespace SimartBackend.Infrastructure.Games;

public sealed class EfGameRepository(SimartDbContext db) : IGameRepository
{
    public Task<Game?> FindGameBySlugAsync(string slug, CancellationToken cancellationToken) =>
        db.Games.FirstOrDefaultAsync(g => g.Slug == slug, cancellationToken);

    public async Task AddResultAsync(GameResult result, CancellationToken cancellationToken)
    {
        db.GameResults.Add(result);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<GameResult>> GetRecentResultsForChildAsync(
        Guid childId, int limit, CancellationToken cancellationToken) =>
        await db.GameResults
            .Where(r => r.ChildId == childId)
            .Include(r => r.Game)
            .OrderByDescending(r => r.PlayedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
}
