using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Habits.Dtos;
using SimartBackend.Domain.Entities.Habits;

namespace SimartBackend.Application.Habits.Commands.CreateFamilyHabitTask;

public sealed class CreateFamilyHabitTaskCommandHandler(
    IHabitCatalogRepository repository, IFamilyAccountRepository familyAccountRepository)
    : IRequestHandler<CreateFamilyHabitTaskCommand, HabitTaskDto>
{
    public async Task<HabitTaskDto> Handle(CreateFamilyHabitTaskCommand request, CancellationToken cancellationToken)
    {
        if (request.XpValue > FamilyHabitLimits.MaxXpValue)
            throw new HabitTaskXpTooHighException(request.XpValue);

        if (!await repository.CategoryExistsAsync(request.CategoryId, cancellationToken))
            throw new HabitCategoryNotFoundException(request.CategoryId);

        if (await repository.CountFamilyTasksAsync(request.FamilyId, cancellationToken) >= FamilyHabitLimits.MaxTasksPerFamily)
            throw new TooManyFamilyHabitTasksException(request.FamilyId);

        if (request.ChildIds.Count == 0)
            throw new NoChildrenSelectedException();

        // Every selected child has to actually belong to this family — same
        // "can't act on someone else's child" check every other childId-keyed
        // Habits endpoint already applies, just once per selected child here.
        foreach (var childId in request.ChildIds)
            await HabitChildOwnership.EnsureCallerOwnsChildAsync(familyAccountRepository, request.FamilyId, childId, cancellationToken);

        var task = new HabitTask
        {
            Id = Guid.NewGuid(),
            CategoryId = request.CategoryId,
            Title = request.Title,
            Note = request.Note,
            XpValue = request.XpValue,
            FamilyId = request.FamilyId,
        };

        await repository.AddFamilyTaskWithAssignmentsAsync(task, request.ChildIds, cancellationToken);

        return HabitTaskDto.FromDomain(task);
    }
}
