using Azure.Monitor.OpenTelemetry.Exporter;
using GraftCodeLogger.Adapters;
using OpenTelemetry;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Shared.Internal;

internal static class DemoTelemetryBootstrap
{
    private static TracerProvider? _tracerProvider;

    public static void Initialize(string serviceName)
    {
        if (_tracerProvider != null)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(serviceName))
        {
            serviceName = Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME")
                ?? Environment.GetEnvironmentVariable("OTEL_SERVICE_NAME")
                ?? "GraftCodeOpenTelemetryDemo";
        }

        var connectionString = Environment.GetEnvironmentVariable("APPLICATIONINSIGHTS_CONNECTION_STRING");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return;
        }

        GraftcodeHypertubeActivitySource.EnsureListenerRegistered();

        _tracerProvider = Sdk.CreateTracerProviderBuilder()
            .ConfigureResource(resource => resource.AddService(serviceName))
            .AddSource(GraftcodeHypertubeActivitySource.SourceName)
            .AddAzureMonitorTraceExporter(options =>
            {
                options.ConnectionString = connectionString;
            })
            .Build();
    }
}
