using GraftCodeLogger;
using GraftCodeLogger.Core;

namespace UserService.Internal;

internal static class GraftTelemetry
{
    public static T RunGraftCall<T>(
        GraftCodeNetcoreLogger logger,
        string targetService,
        string targetMethod,
        Func<Func<T>, IDictionary<string, string>, T> invokeWithHeaders,
        Func<T> graftCall)
    {
        var (incomingTraceId, _) = TelemetryContext.GetIncomingTrace();
        using var operation = GraftCodeNetcoreLogger.StartOperation(
            incomingTraceId,
            null,
            $"Graft → {targetService}.{targetMethod}");
        logger.TrackTrace(targetMethod, $"Graft call to {targetService}.{targetMethod} started.");

        try
        {
            var headers = CreateOutboundTraceHeaders(operation);
            var result = invokeWithHeaders(graftCall, headers);
            logger.TrackTrace(targetMethod, $"Graft call to {targetService}.{targetMethod} completed.");
            return result;
        }
        catch (Exception exception)
        {
            operation.MarkFailed();
            logger.TrackException(targetMethod, exception);
            throw;
        }
    }

    private static Dictionary<string, string> CreateOutboundTraceHeaders(OperationScope operation)
    {
        return new Dictionary<string, string>
        {
            ["traceparent"] = $"00-{operation.TraceId}-{operation.SpanId}-01"
        };
    }
}
