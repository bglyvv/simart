using SimartBackend.Domain.Content;

namespace SimartBackend.Tests.Content;

public class DurationFormatTests
{
    [Theory]
    [InlineData("0:09", 9)]
    [InlineData("0:58", 58)]
    [InlineData("42:19", 2539)]
    [InlineData("1:16:08", 4568)]
    public void ParseToSeconds_matches_the_displayed_duration(string duration, int expectedSeconds)
    {
        Assert.Equal(expectedSeconds, DurationFormat.ParseToSeconds(duration));
    }

    [Theory]
    [InlineData(9, "0:09")]
    [InlineData(58, "0:58")]
    [InlineData(2539, "42:19")]
    [InlineData(4568, "1:16:08")]
    public void FormatFromSeconds_matches_what_YouTube_would_display(int totalSeconds, string expected)
    {
        Assert.Equal(expected, DurationFormat.FormatFromSeconds(totalSeconds));
    }

    [Theory]
    [InlineData("0:09")]
    [InlineData("42:19")]
    [InlineData("1:16:08")]
    public void Round_trips_through_seconds_and_back(string original)
    {
        // What actually matters for the real sync pipeline: Video.sort_order and
        // duration both go through this round trip (seconds in the DB, display
        // string in the API response) — a lossy conversion here would show up as a
        // silently wrong duration on every video, not a crash.
        var seconds = DurationFormat.ParseToSeconds(original);
        Assert.Equal(original, DurationFormat.FormatFromSeconds(seconds));
    }
}
