using SimartBackend.Application.Identity;
using SimartBackend.Application.Identity.Commands.SignUpFamily;
using SimartBackend.Infrastructure.Identity;

namespace SimartBackend.Tests.Identity;

public class SignUpFamilyCommandHandlerTests
{
    private static (SignUpFamilyCommandHandler Handler, InMemoryFamilyAccountRepository Repository) CreateHandler()
    {
        var repository = new InMemoryFamilyAccountRepository();
        var hasher = new PasswordHasherAdapter();
        var tokenService = new JwtAuthTokenService(TestJwtConfiguration.WithDefaultSigningKey());
        return (new SignUpFamilyCommandHandler(repository, hasher, tokenService), repository);
    }

    [Fact]
    public async Task Creates_a_family_and_parent_and_returns_a_usable_token()
    {
        var (handler, repository) = CreateHandler();
        var command = new SignUpFamilyCommand("Leyla Məmmədova", "Leyla@Example.com", "secret123", "4321");

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, result.FamilyId);
        Assert.NotEqual(Guid.Empty, result.ParentId);
        Assert.Equal("Leyla Məmmədova", result.FullName);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));
        // Email normalized (trimmed, lowercased) before being stored/returned —
        // see the handler's own comment on why (case-insensitive uniqueness).
        Assert.Equal("leyla@example.com", result.Email);
        Assert.True(await repository.EmailExistsAsync("leyla@example.com", CancellationToken.None));
    }

    [Fact]
    public async Task Never_stores_the_plaintext_password_or_pin()
    {
        var (handler, repository) = CreateHandler();
        await handler.Handle(
            new SignUpFamilyCommand("Test", "secret@example.com", "mypassword1", "9999"),
            CancellationToken.None);

        var parent = await repository.FindParentByEmailAsync("secret@example.com", CancellationToken.None);
        Assert.NotNull(parent);
        Assert.NotEqual("mypassword1", parent!.PasswordHash);
        Assert.NotEqual("9999", parent.PinHash);
    }

    [Fact]
    public async Task Rejects_a_duplicate_email_case_insensitively()
    {
        var (handler, _) = CreateHandler();
        await handler.Handle(
            new SignUpFamilyCommand("First", "dup@example.com", "secret123", "1111"),
            CancellationToken.None);

        await Assert.ThrowsAsync<EmailAlreadyUsedException>(() => handler.Handle(
            new SignUpFamilyCommand("Second", "DUP@Example.com", "secret123", "2222"),
            CancellationToken.None));
    }
}
