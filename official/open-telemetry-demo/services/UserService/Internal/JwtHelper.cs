using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace UserService.Internal;

internal static class JwtHelper
{
    private const string Issuer = "city-weather-app";
    private const string Audience = "city-weather-users";
    private static readonly byte[] SigningKeyBytes = Encoding.UTF8.GetBytes("city-weather-demo-signing-key-32chars!");

    public static string CreateToken(string username)
    {
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(SigningKeyBytes),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: Issuer,
            audience: Audience,
            claims: new[] { new Claim(JwtRegisteredClaimNames.Sub, username) },
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
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
