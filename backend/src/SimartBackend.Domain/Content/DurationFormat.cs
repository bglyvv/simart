namespace SimartBackend.Domain.Content;

/// <summary>Converts between the display duration YouTube shows ("42:19", "1:16:08",
/// "0:09") and the whole-seconds integer the database stores it as.</summary>
public static class DurationFormat
{
    public static int ParseToSeconds(string duration) =>
        duration.Split(':').Select(int.Parse).Aggregate(0, (acc, part) => acc * 60 + part);

    public static string FormatFromSeconds(int totalSeconds)
    {
        var hours = totalSeconds / 3600;
        var minutes = totalSeconds % 3600 / 60;
        var seconds = totalSeconds % 60;
        return hours > 0 ? $"{hours}:{minutes:D2}:{seconds:D2}" : $"{minutes}:{seconds:D2}";
    }
}
