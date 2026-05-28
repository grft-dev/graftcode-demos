using System.Security.Cryptography.X509Certificates;
using EnergyPriceGrpc.Services;
using Microsoft.AspNetCore.Server.Kestrel.Core;

var builder = WebApplication.CreateBuilder(args);

// HTTPS + HTTP/2 on :5005, sharing the local mkcert PEM with the other services.
// Browsers require TLS for HTTP/2, and gRPC-Web rides over it.
var certPath = Environment.GetEnvironmentVariable("TLS_CERT")
    ?? Path.Combine(builder.Environment.ContentRootPath, "..", "certs", "localhost.pem");
var keyPath = Environment.GetEnvironmentVariable("TLS_KEY")
    ?? Path.Combine(builder.Environment.ContentRootPath, "..", "certs", "localhost-key.pem");

var hasCert = File.Exists(certPath) && File.Exists(keyPath);
// Local: fixed port 5005 over HTTPS. Container (Azure Container Apps): listen on
// $PORT in cleartext HTTP/2 (h2c) — set the Container App ingress transport to
// "http2" so gRPC/gRPC-Web is not downgraded.
var port = hasCert ? 5005 : int.Parse(Environment.GetEnvironmentVariable("PORT") ?? "8080");

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(port, listenOptions =>
    {
        if (hasCert)
        {
            listenOptions.Protocols = HttpProtocols.Http1AndHttp2;
            // Round-trip PEM -> PFX so Schannel (Windows) can use the private key.
            var pem = X509Certificate2.CreateFromPemFile(certPath, keyPath);
            var cert = new X509Certificate2(pem.Export(X509ContentType.Pfx));
            listenOptions.UseHttps(cert);
        }
        else
        {
            // Cleartext HTTP/2 (h2c) to the ingress.
            listenOptions.Protocols = HttpProtocols.Http2;
        }
    });
});

builder.Services.AddGrpc();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders("Grpc-Status", "Grpc-Message", "Grpc-Status-Details-Bin"));
});

var app = builder.Build();

app.UseRouting();
app.UseCors("AllowAll");
// gRPC-Web lets browsers call the gRPC service over the same /energyprice.PriceService/GetPrice path.
app.UseGrpcWeb(new GrpcWebOptions { DefaultEnabled = true });

app.MapGrpcService<PriceServiceImpl>().EnableGrpcWeb().RequireCors("AllowAll");
app.MapGet("/status", () => Results.Ok(new { status = "healthy" }));

app.Run();
