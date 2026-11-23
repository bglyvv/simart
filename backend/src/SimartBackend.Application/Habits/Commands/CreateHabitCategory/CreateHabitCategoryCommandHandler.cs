using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Habits.Dtos;
using SimartBackend.Domain.Entities.Habits;

namespace SimartBackend.Application.Habits.Commands.CreateHabitCategory;

public sealed class CreateHabitCategoryCommandHandler(IHabitCatalogRepository repository)
    : IRequestHandler<CreateHabitCategoryCommand, HabitCategoryDto>
{
    public async Task<HabitCategoryDto> Handle(CreateHabitCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = new HabitCategory
        {
            Id = Guid.NewGuid(),
            Key = request.Key,
            Title = request.Title,
            Icon = request.Icon,
        };

        await repository.AddCategoryAsync(category, cancellationToken);

        // A brand-new category has no tasks yet, so the familyId filter can't change
        // anything here — null is as good as any value.
        return HabitCategoryDto.FromDomain(category, familyId: null);
    }
}
