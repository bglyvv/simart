using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Games.Dtos;
using SimartBackend.Domain.Entities.Economy;
using SimartBackend.Domain.Entities.Games;

namespace SimartBackend.Application.Games.Commands.RecordGamePlay;

public sealed class RecordGamePlayCommandHandler(
    IFamilyAccountRepository familyAccountRepository, IGameRepository gameRepository, IHabitCatalogRepository xpLedger)
    : IRequestHandler<RecordGamePlayCommand, GamePlayDto>
{
    public async Task<GamePlayDto> Handle(RecordGamePlayCommand request, CancellationToken cancellationToken)
    {
        await GamesChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        if (request.Score < 0 || request.Score > 100)
            throw new InvalidGameScoreException(request.Score);

        var game = await gameRepository.FindGameBySlugAsync(request.GameId, cancellationToken)
            ?? throw new GameNotFoundException(request.GameId);

        var result = new GameResult
        {
            Id = Guid.NewGuid(),
            ChildId = request.ChildId,
            GameId = game.Id,
            Score = request.Score,
            PlayedAt = DateTimeOffset.UtcNow,
        };
        await gameRepository.AddResultAsync(result, cancellationToken);

        // Every play is its own independent event (unlike a habit completion,
        // there's no "already played today" to dedupe against) — always a
        // fresh ledger row.
        var xpAwarded = GameXpAward.CalculateXp(request.Score);
        await xpLedger.AddXpTransactionAsync(new XpTransaction
        {
            Id = Guid.NewGuid(),
            ChildId = request.ChildId,
            Amount = xpAwarded,
            Reason = $"Oyun: {game.Title}",
            SourceType = GameXpAward.SourceType,
            SourceId = result.Id,
            CreatedAt = DateTimeOffset.UtcNow,
        }, cancellationToken);

        return new GamePlayDto(result.Id, game.Slug, game.Axis, result.Score, xpAwarded, result.PlayedAt);
    }
}
