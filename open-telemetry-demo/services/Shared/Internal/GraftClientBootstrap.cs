using GraftCodeLogger;

namespace Shared.Internal;

internal static class GraftClientBootstrap
{
    internal static void EnsureLoggerAndTelemetry(string serviceName)
    {
        GraftCodeNetcoreLogger.Init(serviceName);

        try
        {
            DemoTelemetryBootstrap.Initialize(serviceName);
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine(
                $"[open-telemetry-demo] Telemetry bootstrap failed: {exception}");
        }
    }
}
