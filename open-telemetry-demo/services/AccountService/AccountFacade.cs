using AccountService.Internal;
using GraftCodeLogger;
using Shared.Internal;

namespace AccountService;

public static class AccountFacade
{
    private const string ServiceName = "GraftCodeOpenTelemetryDemoAccountServiceNetcore";
    private static readonly GraftCodeNetcoreLogger Logger;
    private static readonly Lazy<UserRepository> Repository = new(InitializeRepository);

    static AccountFacade()
    {
        OpenTelemetryBootstrap.Initialize(ServiceName);
        GraftClientBootstrap.EnsureLoggerAndTelemetry(ServiceName);
        Logger = GraftCodeNetcoreLogger.GetLogger(typeof(AccountFacade));
        Logger.TrackTrace(nameof(AccountFacade), "Account service initialized.");
    }

    public static bool ValidateCredentials(string username, string password)
    {
        var (traceId, parentSpanId) = TelemetryContext.GetIncomingTrace();
        using var operation = GraftCodeNetcoreLogger.StartOperation(traceId, parentSpanId, nameof(ValidateCredentials));

        try
        {
            Logger.TrackTrace(nameof(ValidateCredentials), "Credential validation started.");

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                throw new Exception("Username and password are required.");
            }

            var isValid = Repository.Value.ValidateCredentials(username.Trim(), password);
            Logger.TrackTrace(nameof(ValidateCredentials), "Credential validation completed.");
            return isValid;
        }
        catch (Exception exception)
        {
            operation.MarkFailed();
            Logger.TrackException(nameof(ValidateCredentials), exception);
            throw;
        }
    }

    public static string[] GetCitiesForUser(string username)
    {
        var (traceId, parentSpanId) = TelemetryContext.GetIncomingTrace();
        using var operation = GraftCodeNetcoreLogger.StartOperation(traceId, parentSpanId, nameof(GetCitiesForUser));

        try
        {
            Logger.TrackTrace(nameof(GetCitiesForUser), "City list query started.");

            if (string.IsNullOrWhiteSpace(username))
            {
                throw new Exception("Username is required.");
            }

            var cities = Repository.Value.GetCitiesForUser(username.Trim());
            Logger.TrackTrace(nameof(GetCitiesForUser), "City list query completed.");
            return cities;
        }
        catch (Exception exception)
        {
            operation.MarkFailed();
            Logger.TrackException(nameof(GetCitiesForUser), exception);
            throw;
        }
    }

    public static bool IsCityAllowedForUser(string username, string cityName)
    {
        var (traceId, parentSpanId) = TelemetryContext.GetIncomingTrace();
        using var operation = GraftCodeNetcoreLogger.StartOperation(traceId, parentSpanId, nameof(IsCityAllowedForUser));

        try
        {
            Logger.TrackTrace(nameof(IsCityAllowedForUser), "City authorization check started.");

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(cityName))
            {
                throw new Exception("Username and city name are required.");
            }

            var isAllowed = Repository.Value.IsCityAllowedForUser(username.Trim(), cityName.Trim());
            Logger.TrackTrace(nameof(IsCityAllowedForUser), "City authorization check completed.");
            return isAllowed;
        }
        catch (Exception exception)
        {
            operation.MarkFailed();
            Logger.TrackException(nameof(IsCityAllowedForUser), exception);
            throw;
        }
    }

    private static UserRepository InitializeRepository()
    {
        var repository = new UserRepository(GetConnectionString());
        repository.EnsureSchemaAndSeedData();
        return repository;
    }

    private static string GetConnectionString()
    {
        return Environment.GetEnvironmentVariable("AZURE_SQL_CONNECTION_STRING")
            ?? throw new InvalidOperationException("AZURE_SQL_CONNECTION_STRING is not configured.");
    }
}
