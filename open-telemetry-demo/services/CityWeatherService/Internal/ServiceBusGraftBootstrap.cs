using System.Text.Json;

namespace CityWeatherService.Internal;

internal static class ServiceBusGraftBootstrap
{
    private const string TemperatureGraftName = "graft.nuget.TemperatureConversionService";

    public static bool TryConfigureTemperatureGraft(Action<string> setConfig)
    {
        var connectionString = Environment.GetEnvironmentVariable("SERVICE_BUS_CONNECTION_STRING");
        var queue = Environment.GetEnvironmentVariable("SERVICE_BUS_QUEUE");
        var replyQueue = Environment.GetEnvironmentVariable("SERVICE_BUS_REPLY_QUEUE");

        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(queue))
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(replyQueue))
        {
            throw new InvalidOperationException(
                "SERVICE_BUS_REPLY_QUEUE is required when SERVICE_BUS_CONNECTION_STRING is set.");
        }

        var rpcTimeoutMs = 30000;
        var timeoutValue = Environment.GetEnvironmentVariable("SERVICE_BUS_RPC_TIMEOUT_MS");
        if (!string.IsNullOrWhiteSpace(timeoutValue) && int.TryParse(timeoutValue, out var parsedTimeout))
        {
            rpcTimeoutMs = parsedTimeout;
        }

        var plugin = new Dictionary<string, object>
        {
            ["name"] = "ServiceBusPlugin",
            ["connectionString"] = connectionString,
            ["queue"] = queue,
            ["replyQueue"] = replyQueue,
            ["rpcTimeoutMs"] = rpcTimeoutMs
        };

        var config = new Dictionary<string, object>
        {
            ["configurations"] = new Dictionary<string, object>
            {
                [TemperatureGraftName] = new Dictionary<string, object>
                {
                    ["runtime"] = "netcore",
                    ["stateless"] = "true",
                    // Plugin transport ignores host:port; Hypertube still requires it for PluginConnectionData.
                    ["host"] = "127.0.0.1:0",
                    ["plugin"] = plugin
                }
            }
        };

        setConfig(JsonSerializer.Serialize(config));
        return true;
    }
}
