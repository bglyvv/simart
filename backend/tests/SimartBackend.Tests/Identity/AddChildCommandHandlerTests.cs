using SimartBackend.Application.Identity;
using SimartBackend.Application.Identity.Commands.AddChild;

namespace SimartBackend.Tests.Identity;

public class AddChildCommandHandlerTests
{
    [Fact]
    public async Task Creates_a_child_under_an_existing_family()
    {
        var repository = new InMemoryFamilyAccountRepository();
        var familyId = await repository.SeedFamilyAsync();
        var handler = new AddChildCommandHandler(repository);

        var result = await handler.Handle(
            new AddChildCommand(familyId, "Aysel", "🦄", "girl", new DateOnly(2019, 7, 15), "Baku"),
            CancellationToken.None);

        Assert.Equal(familyId, result.FamilyId);
        Assert.Equal("Aysel", result.Name);
        Assert.Equal("girl", result.Gender);
        Assert.Equal(new DateOnly(2019, 7, 15), result.DateOfBirth);
        Assert.Contains(repository.Children, c => c.Id == result.ChildId);
    }

    [Fact]
    public async Task Throws_when_the_family_does_not_exist()
    {
        var repository = new InMemoryFamilyAccountRepository();
        var handler = new AddChildCommandHandler(repository);

        await Assert.ThrowsAsync<FamilyNotFoundException>(() => handler.Handle(
            new AddChildCommand(Guid.NewGuid(), "Ghost", "🦄", "boy", new DateOnly(2020, 1, 1), "Baku"),
            CancellationToken.None));
    }
}
