using MediatR;
using SimartBackend.Application.Habits.Dtos;

namespace SimartBackend.Application.Habits.Commands.CreateHabitCategory;

public sealed record CreateHabitCategoryCommand(string Key, string Title, string Icon) : IRequest<HabitCategoryDto>;
