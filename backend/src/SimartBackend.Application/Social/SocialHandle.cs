namespace SimartBackend.Application.Social;

/// <summary>Generates the anonymized "@Handle_NN" identity a child posts/appears
/// under — deterministic from their ChildId alone (no name, no email, nothing
/// that could be reversed to who they really are), so the same child always
/// gets the same handle without needing a persisted column on Child. A
/// SocialPost freezes its own Handle at creation time (so an old post's byline
/// never changes even if this list is edited later); the leaderboard
/// (GetLeaderboardQuery) computes it fresh from ChildId directly, since a
/// child can rank without ever having posted.
///
/// Picked from a fixed list of whole, pre-built compound words (not assembled
/// from separate prefix/suffix parts) matching the style of the project's
/// original mock data (e.g. "@UlduzKəşfiyyatçı_44") — safer than generating
/// grammatically-combined Azerbaijani compounds on the fly.</summary>
public static class SocialHandle
{
    private static readonly string[] Words =
    [
        "UlduzKəşfiyyatçı", "BalacaAlim", "Kəşfiyyatçı", "TədqiqatçıUlduz", "QəhrəmanBala",
        "ŞənKəşfiyyatçı", "ÇevikTülkü", "ParlaqUlduz", "CəsurPələng", "GöyQartal",
        "KiçikAlim", "UlduzGücü", "BalacaQəhrəman", "Tədqiqatçı", "UlduzDostu",
        "ÇevikDovşan", "CəsurAslan", "ŞənBala", "GöyUlduz", "Kəşfiyyatçı",
    ];

    public static string Generate(Guid childId)
    {
        var bytes = childId.ToByteArray();
        var word = Words[bytes[0] % Words.Length];
        var number = (bytes[1] * 256 + bytes[2]) % 100;
        return $"@{word}_{number}";
    }
}
