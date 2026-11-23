using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Habits.Dtos;

namespace SimartBackend.Application.Habits.Queries.GetHabitCategories;

public sealed class GetHabitCategoriesQueryHandler(IHabitCatalogRepository repository)
    : IRequestHandler<GetHabitCategoriesQuery, IReadOnlyList<HabitCategoryDto>>
{
    public async Task<IReadOnlyList<HabitCategoryDto>> Handle(GetHabitCategoriesQuery request, CancellationToken cancellationToken)
    {
        var categories = await repository.GetAllCategoriesAsync(cancellationToken);
        return categories.Select(c => HabitCategoryDto.FromDomain(c, request.FamilyId)).ToList();
    }
}
