using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Habits.Dtos;
using SimartBackend.Domain.Entities.Habits;

namespace SimartBackend.Application.Habits.Commands.CreateFamilyHabitTask;

public sealed class CreateFamilyHabitTaskCommandHandler(IHabitCatalogRepository repository)
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

        var task = new HabitTask
        {
            Id = Guid.NewGuid(),
            CategoryId = request.CategoryId,
            Title = request.Title,
            Note = request.Note,
            XpValue = request.XpValue,
            FamilyId = request.FamilyId,
        };

        await repository.AddTaskAsync(task, cancellationToken);

        return HabitTaskDto.FromDomain(task);
    }
}
