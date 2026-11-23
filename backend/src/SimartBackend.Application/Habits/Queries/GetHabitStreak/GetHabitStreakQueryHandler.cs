using MediatR;
using SimartBackend.Application.Abstractions;
using SimartBackend.Application.Habits.Dtos;

namespace SimartBackend.Application.Habits.Queries.GetHabitStreak;

public sealed class GetHabitStreakQueryHandler(
    IFamilyAccountRepository familyAccountRepository, IHabitCatalogRepository habitCatalogRepository)
    : IRequestHandler<GetHabitStreakQuery, HabitStreakDto>
{
    public async Task<HabitStreakDto> Handle(GetHabitStreakQuery request, CancellationToken cancellationToken)
    {
        await HabitChildOwnership.EnsureCallerOwnsChildAsync(
            familyAccountRepository, request.CallerFamilyId, request.ChildId, cancellationToken);

        var completionDates = await habitCatalogRepository.GetCompletionDatesAsync(request.ChildId, cancellationToken);
        var today = request.Today;

        // Today counts toward the streak the moment it has a completion; until
        // then the streak is still "alive" off yesterday — same Duolingo-style
        // rule the per-task streak bonus (HabitXpAward) doesn't need, since that
        // one only ever runs at the exact moment a completion is written.
        var consecutiveDays = 0;
        var cursor = completionDates.Contains(today) ? today : today.AddDays(-1);
        while (completionDates.Contains(cursor))
        {
            consecutiveDays++;
            cursor = cursor.AddDays(-1);
        }

        // Monday-Sunday week containing Today — DateOnly.DayOfWeek has
        // Sunday == 0, so shift it to a Monday-first index before subtracting.
        var daysSinceMonday = ((int)today.DayOfWeek + 6) % 7;
        var weekStart = today.AddDays(-daysSinceMonday);
        var week = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var date = weekStart.AddDays(offset);
                var state = date == today ? "today"
                    : date > today ? "upcoming"
                    : completionDates.Contains(date) ? "done" : "missed";
                return new HabitStreakDayDto(date, state);
            })
            .ToList();

        return new HabitStreakDto(consecutiveDays, week);
    }
}
