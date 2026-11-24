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

        if (request.ChildId is not Guid childId)
            return categories.Select(c => HabitCategoryDto.FromDomain(c, request.FamilyId)).ToList();

        var allTaskIds = categories.SelectMany(c => c.Tasks).Select(t => t.Id).ToList();
        var assignmentsByTaskId = await repository.GetAssignmentsForTasksAsync(allTaskIds, cancellationToken);

        return categories
            .Select(c => HabitCategoryDto.FromDomainForChild(c, request.FamilyId, childId, assignmentsByTaskId))
            .ToList();
    }
}
