using Grpc.Core;

namespace EnergyPriceGrpc.Services;

// Same logic as electric-company-be. Running on Kestrel/.NET makes the
// gRPC-vs-REST comparison apples-to-apples (same runtime as electric-company-ws).
public class PriceServiceImpl : PriceService.PriceServiceBase
{
    public override Task<GetPriceResponse> GetPrice(GetPriceRequest request, ServerCallContext context)
    {
        var price = Random.Shared.Next(1, 998);
        return Task.FromResult(new GetPriceResponse { Price = price });
    }

    // Large payload: build `count` prices and return them in one message.
    public override Task<GetPriceHistoryResponse> GetPriceHistory(
        GetPriceHistoryRequest request, ServerCallContext context)
    {
        var count = Clamp(request.Count);
        var response = new GetPriceHistoryResponse();
        for (var i = 0; i < count; i++)
        {
            response.Prices.Add(Random.Shared.Next(1, 998));
        }
        return Task.FromResult(response);
    }

    // Server streaming: emit `count` prices one at a time over one HTTP/2 stream.
    public override async Task StreamPrices(
        StreamPricesRequest request, IServerStreamWriter<PriceValue> responseStream, ServerCallContext context)
    {
        var count = Clamp(request.Count);
        for (var i = 0; i < count && !context.CancellationToken.IsCancellationRequested; i++)
        {
            await responseStream.WriteAsync(new PriceValue
            {
                Value = Random.Shared.Next(1, 998),
            });
        }
    }

    private static int Clamp(int count) => count <= 0 ? 1 : Math.Min(count, 200_000);
}
