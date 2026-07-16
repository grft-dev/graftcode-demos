using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Graftcode.Context;
using Microsoft.IdentityModel.Tokens;

namespace CityWeatherService.Internal;

internal static class JwtHelper
{
    private const string Issuer = "city-weather-app";
    private const string Audience = "city-weather-users";
    private static readonly byte[] SigningKeyBytes = Encoding.UTF8.GetBytes("city-weather-demo-signing-key-32chars!");

    public static string GetAuthenticatedUsername()
    {
        var context = RequestContext.Current;
        if (context == null)
        {
            throw new Exception("Request context is not available.");
        }

        var headers = context.GetHeaders();
        var authHeader = headers
            .FirstOrDefault(h => string.Equals(h.Key, "Authorization", StringComparison.OrdinalIgnoreCase))
            .Value;

        if (string.IsNullOrWhiteSpace(authHeader)
            || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            throw new Exception("Missing or invalid Authorization header.");
        }

        var token = authHeader.Substring("Bearer ".Length).Trim();
        return ValidateAndGetUsername(token);
    }

    public static string ValidateAndGetUsername(string token)
    {
        var handler = new JwtSecurityTokenHandler();
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = Issuer,
            ValidateAudience = true,
            ValidAudience = Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(SigningKeyBytes),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = JwtRegisteredClaimNames.Sub
        };

        var principal = handler.ValidateToken(token, parameters, out _);
        var username = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrWhiteSpace(username))
        {
            throw new Exception("Token does not contain a valid user identity.");
        }

        return username;
    }
}
