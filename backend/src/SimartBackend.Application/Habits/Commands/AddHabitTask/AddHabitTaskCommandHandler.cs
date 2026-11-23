using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Habits.Dtos;
using SimartBackend.Domain.Entities.Habits;

namespace SimartBackend.Application.Habits.Commands.AddHabitTask;

public sealed class AddHabitTaskCommandHandler(IHabitCatalogRepository repository)
    : IRequestHandler<AddHabitTaskCommand, HabitTaskDto>
{
    public async Task<HabitTaskDto> Handle(AddHabitTaskCommand request, CancellationToken cancellationToken)
    {
        if (!await repository.CategoryExistsAsync(request.CategoryId, cancellationToken))
            throw new HabitCategoryNotFoundException(request.CategoryId);

        var task = new HabitTask
        {
            Id = Guid.NewGuid(),
            CategoryId = request.CategoryId,
            Title = request.Title,
            Note = request.Note,
            XpValue = request.XpValue,
        };

        await repository.AddTaskAsync(task, cancellationToken);

        return HabitTaskDto.FromDomain(task);
    }
}
