using SimartBackend.Domain.Entities.Identity;

namespace SimartBackend.Domain.Entities.Focus;

/// <summary>One row per child per calendar day — cumulative seconds actually
/// spent watching animations that day, built up by repeated small increments
/// from real elapsed playback time on the frontend (never a simulated or
/// guessed value). Backs HabitsPage.tsx's "Bugünkü ekran vaxtı" stat — a
/// different concept from <see cref="FocusSession"/>, which only ever records
/// lock events ("when, until when, why"), never cumulative watch-time; see
/// root CLAUDE.md's "Focus Mode" section for why that table couldn't double
/// for this.</summary>
public class ScreenTimeEntry
{
    public Guid Id { get; set; }
    public Guid ChildId { get; set; }
    public DateOnly Date { get; set; }
    public int TotalSeconds { get; set; }

    public Child Child { get; set; } = null!;
}
