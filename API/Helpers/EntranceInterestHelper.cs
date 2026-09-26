namespace API.Helpers;

public static class EntranceInterestHelper
{
    public static string? Normalize(string? interests)
    {
        var normalized = Parse(interests);
        return normalized.Count == 0 ? null : string.Join("; ", normalized);
    }

    public static IReadOnlyList<string> Parse(string? interests)
    {
        return (interests ?? string.Empty)
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(interest => interest.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}