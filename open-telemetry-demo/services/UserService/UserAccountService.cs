using Graftcode.Context;
using GraftCodeLogger;
using UserService.Internal;
using UserService.Models;
using GraftAccount = graft.nuget.AccountService;

namespace UserService;

public static class UserAccountService
{
    private const string ServiceName = "GraftCodeOpenTelemetryDemoUserServiceNetcore";
    private static readonly GraftCodeNetcoreLogger Logger;

    static UserAccountService()
    {
        GraftCodeNetcoreLogger.Init(ServiceName);
        Logger = GraftCodeNetcoreLogger.GetLogger(typeof(UserAccountService));
        GraftAccount.GraftConfig.Host = GetAccountServiceHost();
        GraftAccount.GraftConfig.Stateless = true;
        Logger.TrackTrace(nameof(UserAccountService), "User service initialized.");
    }

    public static LoginResult Login(string username, string password)
    {
        var (traceId, parentSpanId) = TelemetryContext.GetIncomingTrace();
        using var operation = GraftCodeNetcoreLogger.StartOperation(traceId, parentSpanId, nameof(Login));

        try
        {
            Logger.TrackTrace(nameof(Login), "Login operation started.");

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                throw new Exception("Username and password are required.");
            }

            var normalizedUsername = username.Trim();
            var isValid = GraftTelemetry.RunGraftCall(
                Logger,
                "AccountFacade",
                nameof(GraftAccount.AccountFacade.ValidateCredentials),
                (call, headers) => GraftAccount.GraftConfig.InvokeWithHeaders(call, headers),
                () => GraftAccount.AccountFacade.ValidateCredentials(normalizedUsername, password));

            if (!isValid)
            {
                throw new Exception("Invalid username or password.");
            }

            var result = new LoginResult
            {
                Token = JwtHelper.CreateToken(normalizedUsername),
                Username = normalizedUsername
            };

            Logger.TrackTrace(nameof(Login), "Login operation completed.");
            return result;
        }
        catch (Exception exception)
        {
            operation.MarkFailed();
            Logger.TrackException(nameof(Login), exception);
            throw;
        }
    }

    public static string[] GetCities()
    {
        var (traceId, parentSpanId) = TelemetryContext.GetIncomingTrace();
        using var operation = GraftCodeNetcoreLogger.StartOperation(traceId, parentSpanId, nameof(GetCities));

        try
        {
            Logger.TrackTrace(nameof(GetCities), "City list operation started.");
            var username = GetAuthenticatedUsername();
            var cities = GraftTelemetry.RunGraftCall(
                Logger,
                "AccountFacade",
                nameof(GraftAccount.AccountFacade.GetCitiesForUser),
                (call, headers) => GraftAccount.GraftConfig.InvokeWithHeaders(call, headers),
                () => GraftAccount.AccountFacade.GetCitiesForUser(username));
            Logger.TrackTrace(nameof(GetCities), "City list operation completed.");
            return cities;
        }
        catch (Exception exception)
        {
            operation.MarkFailed();
            Logger.TrackException(nameof(GetCities), exception);
            throw;
        }
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

    private static string GetAccountServiceHost()
    {
        return Environment.GetEnvironmentVariable("ACCOUNT_SERVICE_GRAFT_HOST")
            ?? "ws://account-service/ws";
    }
}
