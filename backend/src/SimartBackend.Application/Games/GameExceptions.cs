namespace SimartBackend.Application.Games;

/// <summary>Thrown when the given childId doesn't exist — mapped to 404. Same
/// split-purpose as FocusChildNotFoundException: about resolving which family
/// owns a child for the ownership check, not about family existence itself.</summary>
public sealed class GameChildNotFoundException(Guid childId)
    : Exception($"Child '{childId}' was not found.");

/// <summary>Thrown when the caller's token family doesn't own the given child
/// — mapped to 403, same "can't write into another family" rule as
/// FocusAccessDeniedException.</summary>
public sealed class GameAccessDeniedException()
    : Exception("This child does not belong to your family.");

/// <summary>Thrown by RecordGamePlayCommandHandler when the given gameId slug
/// doesn't match one of the seeded games — mapped to 404. The frontend's
/// GAME_CATALOG only ever sends one of the six known slugs, but nothing stops
/// a direct API call from sending garbage.</summary>
public sealed class GameNotFoundException(string slug)
    : Exception($"Game '{slug}' was not found.");

/// <summary>Thrown by RecordGamePlayCommandHandler when Score falls outside
/// 0-100 — mapped to 400. Defense in depth: every mini-game's own `onFinish`
/// already clamps its score to a percentage, but nothing stops a direct API
/// call from sending something absurd.</summary>
public sealed class InvalidGameScoreException(int score)
    : Exception($"Score {score} is outside the allowed range (0-100).");
