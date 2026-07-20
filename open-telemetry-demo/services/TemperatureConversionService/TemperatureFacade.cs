using GraftCodeLogger;
using Shared.Internal;
using TemperatureConversionService.Internal;

namespace TemperatureConversionService;

public static class TemperatureFacade
{
    private const string ServiceName = "GraftCodeOpenTelemetryDemoTemperatureConversionServiceNetcore";
    private static readonly GraftCodeNetcoreLogger Logger;

    static TemperatureFacade()
    {
        GraftClientBootstrap.EnsureLoggerAndTelemetry(ServiceName);
        Logger = GraftCodeNetcoreLogger.GetLogger(typeof(TemperatureFacade));
        Logger.TrackTrace(nameof(TemperatureFacade), "Temperature conversion service initialized.");
    }

    public static double ConvertCelsiusToFahrenheit(double celsius)
    {
        var (traceId, parentSpanId) = TelemetryContext.GetIncomingTrace();
        using var operation = GraftCodeNetcoreLogger.StartOperation(
            traceId,
            parentSpanId,
            nameof(ConvertCelsiusToFahrenheit));

        try
        {
            Logger.TrackTrace(nameof(ConvertCelsiusToFahrenheit), "Temperature conversion started.");

            if (celsius < -273.15)
            {
                throw new ArgumentOutOfRangeException(nameof(celsius), "Temperature is below absolute zero.");
            }

            var fahrenheit = (celsius * 9d / 5d) + 32d;
            Logger.TrackTrace(nameof(ConvertCelsiusToFahrenheit), "Temperature conversion completed.");
            return fahrenheit;
        }
        catch (Exception exception)
        {
            operation.MarkFailed();
            Logger.TrackException(nameof(ConvertCelsiusToFahrenheit), exception);
            throw;
        }
    }
}
