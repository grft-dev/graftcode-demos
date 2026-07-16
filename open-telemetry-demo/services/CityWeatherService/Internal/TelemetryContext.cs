using Graftcode.Context;

namespace CityWeatherService.Internal;

internal static class TelemetryContext
{
    internal static (string? TraceId, string? ParentSpanId) GetIncomingTrace()
    {
        var traceParent = RequestContext.Current?
            .GetHeaders()
            .FirstOrDefault(header =>
                string.Equals(header.Key, "traceparent", StringComparison.OrdinalIgnoreCase))
            .Value;

        if (string.IsNullOrWhiteSpace(traceParent))
        {
            return (null, null);
        }

        var parts = traceParent.Trim().Split('-');
        if (parts.Length != 4
            || !IsHex(parts[0], 2, allowZero: true)
            || string.Equals(parts[0], "ff", StringComparison.OrdinalIgnoreCase)
            || !IsHex(parts[1], 32, allowZero: false)
            || !IsHex(parts[2], 16, allowZero: false)
            || !IsHex(parts[3], 2, allowZero: true))
        {
            return (null, null);
        }

        return (parts[1].ToLowerInvariant(), parts[2].ToLowerInvariant());
    }

    private static bool IsHex(string value, int length, bool allowZero)
    {
        if (value.Length != length || (!allowZero && value.All(character => character == '0')))
        {
            return false;
        }

        return value.All(character =>
            (character >= '0' && character <= '9')
            || (character >= 'a' && character <= 'f')
            || (character >= 'A' && character <= 'F'));
    }
}
