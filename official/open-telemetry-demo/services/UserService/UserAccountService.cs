using Graftcode.Context;
using UserService.Internal;
using UserService.Models;

namespace UserService;

public static class UserAccountService
{
    public static LoginResult Login(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            throw new Exception("Username and password are required.");
        }

        if (!UserStore.TryAuthenticate(username.Trim(), password, out _))
        {
            throw new Exception("Invalid username or password.");
        }

        var normalizedUsername = username.Trim();
        return new LoginResult
        {
            Token = JwtHelper.CreateToken(normalizedUsername),
            Username = normalizedUsername
        };
    }

    public static string[] GetCities()
    {
        var username = GetAuthenticatedUsername();
        return UserStore.GetCitiesForUser(username);
    }

    private static string GetAuthenticatedUsername()
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
        return JwtHelper.ValidateAndGetUsername(token);
    }
}
