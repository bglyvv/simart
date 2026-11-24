using MediatR;
using SimartBackend.Application.Habits.Dtos;

namespace SimartBackend.Application.Habits.Queries.GetHabitCategories;

/// <summary>FamilyId null -> admin-catalog tasks only (the admin panel's view); a
/// real familyId -> admin-catalog tasks plus that family's own custom ones (the
/// family app's view). See HabitCategoryDto.FromDomain. ChildId, only meaningful
/// alongside a real FamilyId, further restricts a family's custom tasks to the
/// ones assigned to that specific child (HabitsPage.tsx's own view) — see
/// HabitCategoryDto.FromDomainForChild. Omitted entirely (the admin-management
/// view, or a family-wide "manage habits" list with no specific child in
/// context) keeps the old unfiltered-by-child behavior.</summary>
public sealed record GetHabitCategoriesQuery(Guid? FamilyId, Guid? ChildId = null) : IRequest<IReadOnlyList<HabitCategoryDto>>;
