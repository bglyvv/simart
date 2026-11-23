namespace SimartBackend.Application.Games.Dtos;

/// <summary>GameId is the real slug (GAME_CATALOG's id, e.g. "memory"), never
/// the internal Game.Id — same "never surface the internal Guid" convention
/// as every other public identifier in this backend. Shared by both
/// RecordGamePlayCommand's response and GetGamePlaysQuery's list items.</summary>
public sealed record GamePlayDto(Guid Id, string GameId, string Axis, int Score, int XpAwarded, DateTimeOffset PlayedAt);
