using System;
using System.IO;
using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace EnergyPriceService
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Serve REST over HTTPS with HTTP/2 (h2) so it matches the gRPC and
            // Graftcode paths in the perf-lab benchmark. Browsers require TLS for
            // HTTP/2, so we load the shared local mkcert PEM. HTTP/1.1 stays
            // enabled as a fallback for non-h2 clients.
            var certPath = Environment.GetEnvironmentVariable("TLS_CERT")
                ?? Path.Combine(builder.Environment.ContentRootPath, "..", "certs", "localhost.pem");
            var keyPath = Environment.GetEnvironmentVariable("TLS_KEY")
                ?? Path.Combine(builder.Environment.ContentRootPath, "..", "certs", "localhost-key.pem");

            var hasCert = File.Exists(certPath) && File.Exists(keyPath);
            // Local: fixed port 8090 over HTTPS. Container (Azure Container Apps):
            // listen on $PORT in cleartext — the ingress terminates TLS and offers
            // HTTP/2 to the browser.
            var port = hasCert ? 8090 : int.Parse(Environment.GetEnvironmentVariable("PORT") ?? "8080");

            builder.WebHost.ConfigureKestrel(options =>
            {
                options.ListenAnyIP(port, listenOptions =>
                {
                    if (hasCert)
                    {
                        // HTTP/1.1 + HTTP/2 negotiated via ALPN over TLS.
                        listenOptions.Protocols = HttpProtocols.Http1AndHttp2;
                        // Round-trip the PEM through PFX so Schannel (Windows) can
                        // access the private key; using the PEM cert directly fails
                        // the TLS handshake on Windows.
                        var pem = X509Certificate2.CreateFromPemFile(certPath, keyPath);
                        var cert = new X509Certificate2(pem.Export(X509ContentType.Pfx));
                        listenOptions.UseHttps(cert);
                    }
                    else
                    {
                        // Cleartext to the ingress. Without TLS there is no ALPN, so a
                        // cleartext port serves one protocol; REST uses HTTP/1.1 here.
                        // Set the Container App ingress transport to "auto" so the
                        // browser still negotiates HTTP/2 with the ingress.
                        listenOptions.Protocols = HttpProtocols.Http1;
                    }
                });
            });

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", policy =>
                    policy
                        .AllowAnyOrigin()
                        .AllowAnyHeader()
                        .AllowAnyMethod());
            });

            var app = builder.Build();

            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseRouting();
            app.UseCors("AllowAll");

            app.UseAuthorization();

            app.MapControllers();

            // Health check endpoint for Container App probes
            app.MapGet("/status", () => Results.Ok(new { status = "healthy" }));

            app.Run();
        }
    }
}


