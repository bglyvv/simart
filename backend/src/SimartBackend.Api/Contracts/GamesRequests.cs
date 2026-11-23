namespace SimartBackend.Api.Contracts;

/// <summary>GameId is the real slug (GAME_CATALOG's id, e.g. "memory"), not
/// the internal Game.Id — resolved server-side, same convention as every
/// other public identifier in this backend.</summary>
public sealed record RecordGamePlayRequest(string GameId, int Score);
