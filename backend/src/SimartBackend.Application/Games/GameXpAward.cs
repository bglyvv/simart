namespace SimartBackend.Application.Games;

/// <summary>The one place the per-play XP formula lives — mirrors
/// GamesPage.tsx's own `Math.round(5 + score / 5)` exactly, so the backend's
/// authoritative amount (what actually gets written to XpTransaction) never
/// surprises the frontend's own display. Same "server computes, client
/// doesn't get to just send a number" posture as HabitXpAward's streak bonus.</summary>
public static class GameXpAward
{
    public const string SourceType = "game_play";

    private const int BaseXp = 5;
    private const int MaxXp = 25;

    public static int CalculateXp(int score) =>
        Math.Clamp((int)Math.Round(BaseXp + score / 5.0, MidpointRounding.AwayFromZero), BaseXp, MaxXp);
}
