namespace SimartBackend.Api.Contracts;

public sealed record CreateHabitCategoryRequest(string Key, string Title, string Icon);

public sealed record AddHabitTaskRequest(string Title, string? Note, int XpValue);

public sealed record CreateFamilyHabitTaskRequest(Guid CategoryId, string Title, string? Note, int XpValue);

public sealed record CompleteHabitTaskRequest(Guid TaskId, DateOnly LogDate);
