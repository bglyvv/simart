namespace SimartBackend.Application.Partners;

/// <summary>Generates the short code actually encoded in a voucher's QR
/// image — rendered client-side, and short enough for a partner to type by
/// hand if the camera scan fails. 10 characters from a 32-symbol alphabet
/// (uppercase letters and digits, minus the visually ambiguous O/0/I/1) is
/// ~50 bits of randomness — collision odds against the unique index on
/// Voucher.Code are astronomically low, so this doesn't bother retrying on
/// a (never-observed) collision, same "don't over-engineer" posture as
/// every other id generator in this backend (they're all just Guid.NewGuid()
/// — this one can't be, since a Guid is unusable to type/read off a
/// physical receipt).</summary>
public static class VoucherCodeGenerator
{
    private const string Alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const int Length = 10;

    public static string Generate()
    {
        Span<char> buffer = stackalloc char[Length];
        for (var i = 0; i < Length; i++)
            buffer[i] = Alphabet[Random.Shared.Next(Alphabet.Length)];
        return new string(buffer);
    }
}
