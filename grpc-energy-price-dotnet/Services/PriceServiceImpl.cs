using Grpc.Core;

namespace EnergyPriceGrpc.Services;

// Same logic as electric-company-be. Running on Kestrel/.NET makes the
// gRPC-vs-REST comparison apples-to-apples (same runtime as electric-company-ws).
public class PriceServiceImpl : PriceService.PriceServiceBase
{
    private const long MinuteMs = 60_000;

    public override Task<GetPriceResponse> GetPrice(GetPriceRequest request, ServerCallContext context)
    {
        var price = Random.Shared.Next(1, 998);
        return Task.FromResult(new GetPriceResponse { Price = price });
    }

    // Large payload: build `count` points and return them in one message.
    public override Task<GetPriceHistoryResponse> GetPriceHistory(
        GetPriceHistoryRequest request, ServerCallContext context)
    {
        var count = Clamp(request.Count);
        var response = new GetPriceHistoryResponse();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        for (var i = 0; i < count; i++)
        {
            response.Points.Add(MakePoint(i, now));
        }
        return Task.FromResult(response);
    }

    // Server streaming: emit `count` points one at a time over one HTTP/2 stream.
    public override async Task StreamPrices(
        StreamPricesRequest request, IServerStreamWriter<PricePoint> responseStream, ServerCallContext context)
    {
        var count = Clamp(request.Count);
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        for (var i = 0; i < count && !context.CancellationToken.IsCancellationRequested; i++)
        {
            await responseStream.WriteAsync(MakePoint(i, now));
        }
    }

    private static int Clamp(int count) => count <= 0 ? 1 : Math.Min(count, 200_000);

    private static PricePoint MakePoint(int i, long now)
    {
        var price = Random.Shared.Next(1, 998);
        return new PricePoint
        {
            Timestamp = now - (long)i * MinuteMs,
            Price = price,
            Low = price * 0.9,
            High = price * 1.1,
            Average = price,
            Currency = "EUR",
            Region = "EU-Central",
            Source = $"grid-meter-{i % 64}",
        };
    }
}
