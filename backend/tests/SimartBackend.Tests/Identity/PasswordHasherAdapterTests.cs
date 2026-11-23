using SimartBackend.Infrastructure.Identity;

namespace SimartBackend.Tests.Identity;

public class PasswordHasherAdapterTests
{
    private readonly PasswordHasherAdapter _hasher = new();

    [Fact]
    public void Hash_produces_a_value_different_from_the_input()
    {
        var hash = _hasher.Hash("correct horse battery staple");
        Assert.NotEqual("correct horse battery staple", hash);
    }

    [Fact]
    public void Verify_succeeds_for_the_original_plaintext()
    {
        var hash = _hasher.Hash("correct horse battery staple");
        Assert.True(_hasher.Verify(hash, "correct horse battery staple"));
    }

    [Fact]
    public void Verify_fails_for_the_wrong_plaintext()
    {
        var hash = _hasher.Hash("correct horse battery staple");
        Assert.False(_hasher.Verify(hash, "wrong password"));
    }

    [Fact]
    public void Hashing_the_same_plaintext_twice_produces_different_hashes()
    {
        // PBKDF2 salts each hash independently — this is what makes rainbow-table
        // attacks useless, not an implementation quirk to "fix".
        var first = _hasher.Hash("same input");
        var second = _hasher.Hash("same input");
        Assert.NotEqual(first, second);
    }
}
