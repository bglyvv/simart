using MediatR;
using SimartBackend.Application.Habits.Dtos;

namespace SimartBackend.Application.Habits.Queries.GetHabitCategories;

/// <summary>FamilyId null -> admin-catalog tasks only (the admin panel's view); a
/// real familyId -> admin-catalog tasks plus that family's own custom ones (the
/// family app's view). See HabitCategoryDto.FromDomain.</summary>
public sealed record GetHabitCategoriesQuery(Guid? FamilyId) : IRequest<IReadOnlyList<HabitCategoryDto>>;
