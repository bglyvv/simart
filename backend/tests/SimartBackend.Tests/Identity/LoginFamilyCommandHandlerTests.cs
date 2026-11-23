using SimartBackend.Application.Identity;
using SimartBackend.Application.Identity.Commands.LoginFamily;
using SimartBackend.Application.Identity.Commands.SignUpFamily;
using SimartBackend.Infrastructure.Identity;

namespace SimartBackend.Tests.Identity;

public class LoginFamilyCommandHandlerTests
{
    private static (LoginFamilyCommandHandler Login, SignUpFamilyCommandHandler Signup) CreateHandlers()
    {
        var repository = new InMemoryFamilyAccountRepository();
        var hasher = new PasswordHasherAdapter();
        var tokenService = new JwtAuthTokenService(TestJwtConfiguration.WithDefaultSigningKey());
        return (
            new LoginFamilyCommandHandler(repository, hasher, tokenService),
            new SignUpFamilyCommandHandler(repository, hasher, tokenService));
    }

    [Fact]
    public async Task Succeeds_with_the_correct_email_and_password()
    {
        var (login, signup) = CreateHandlers();
        await signup.Handle(
            new SignUpFamilyCommand("Parent", "parent@example.com", "correct-password", "1234"),
            CancellationToken.None);

        var result = await login.Handle(
            new LoginFamilyCommand("parent@example.com", "correct-password"),
            CancellationToken.None);

        Assert.Equal("parent@example.com", result.Email);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));
    }

    [Fact]
    public async Task Rejects_the_wrong_password()
    {
        var (login, signup) = CreateHandlers();
        await signup.Handle(
            new SignUpFamilyCommand("Parent", "parent2@example.com", "correct-password", "1234"),
            CancellationToken.None);

        await Assert.ThrowsAsync<InvalidCredentialsException>(() =>
            login.Handle(new LoginFamilyCommand("parent2@example.com", "wrong-password"), CancellationToken.None));
    }

    [Fact]
    public async Task Rejects_an_unregistered_email_with_the_same_exception_as_a_wrong_password()
    {
        // Same exception either way — see InvalidCredentialsException's doc comment:
        // this is what stops the endpoint being used to enumerate registered emails.
        var (login, _) = CreateHandlers();

        await Assert.ThrowsAsync<InvalidCredentialsException>(() =>
            login.Handle(new LoginFamilyCommand("nobody@example.com", "whatever"), CancellationToken.None));
    }

    [Fact]
    public async Task Login_is_case_insensitive_on_email()
    {
        var (login, signup) = CreateHandlers();
        await signup.Handle(
            new SignUpFamilyCommand("Parent", "CaseTest@Example.com", "correct-password", "1234"),
            CancellationToken.None);

        var result = await login.Handle(
            new LoginFamilyCommand("casetest@example.com", "correct-password"),
            CancellationToken.None);

        Assert.Equal("casetest@example.com", result.Email);
    }
}
