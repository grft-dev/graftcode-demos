using Azure.Monitor.OpenTelemetry.Exporter;
using OpenTelemetry;
using OpenTelemetry.Trace;

namespace AccountService.Internal;

internal static class OpenTelemetryBootstrap
{
    private static TracerProvider? _tracerProvider;

    public static void Initialize()
    {
        if (_tracerProvider != null)
        {
            return;
        }

        var connectionString = Environment.GetEnvironmentVariable("APPLICATIONINSIGHTS_CONNECTION_STRING");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return;
        }

        _tracerProvider = Sdk.CreateTracerProviderBuilder()
            .AddSqlClientInstrumentation(options =>
            {
                options.SetDbStatementForText = false;
                options.RecordException = true;
            })
            .AddAzureMonitorTraceExporter(options =>
            {
                options.ConnectionString = connectionString;
            })
            .Build();
    }
}
