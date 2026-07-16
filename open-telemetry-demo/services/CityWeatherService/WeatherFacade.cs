using CityWeatherService.Internal;
using CityWeatherService.Models;
using GraftCodeLogger;
using GraftAccount = graft.nuget.AccountService;
using GraftTemperature = graft.nuget.TemperatureConversionService;
using GraftWeather = graft.nuget.WeatherService;

namespace CityWeatherService;

public static class WeatherFacade
{
    private const string ServiceName = "GraftCodeOpenTelemetryDemoCityWeatherServiceNetcore";
    private static readonly GraftCodeNetcoreLogger Logger;

    static WeatherFacade()
    {
        GraftCodeNetcoreLogger.Init(ServiceName);
        Logger = GraftCodeNetcoreLogger.GetLogger(typeof(WeatherFacade));
        GraftAccount.GraftConfig.Host = GetAccountServiceHost();
        GraftAccount.GraftConfig.Stateless = true;

        if (!ServiceBusGraftBootstrap.TryConfigureTemperatureGraft(GraftTemperature.GraftConfig.SetConfig))
        {
            GraftTemperature.GraftConfig.Host = GetTemperatureConversionServiceHost();
            GraftTemperature.GraftConfig.Stateless = true;
        }

        GraftWeather.GraftConfig.Host = "wss://dotnetweatherapi.onrender.com/ws";
        GraftWeather.GraftConfig.Stateless = true;
        Logger.TrackTrace(nameof(WeatherFacade), "City weather service initialized.");
    }

    public static CityWeather GetWeather(string cityName)
    {
        var (traceId, parentSpanId) = TelemetryContext.GetIncomingTrace();
        using var operation = GraftCodeNetcoreLogger.StartOperation(traceId, parentSpanId, nameof(GetWeather));

        try
        {
            Logger.TrackTrace(nameof(GetWeather), "Weather operation started.");
            var username = JwtHelper.GetAuthenticatedUsername();

            if (string.IsNullOrWhiteSpace(cityName))
            {
                throw new Exception("City name is required.");
            }

            var query = cityName.Trim();
            var isAllowed = GraftTelemetry.RunGraftCall(
                Logger,
                "AccountFacade",
                nameof(GraftAccount.AccountFacade.IsCityAllowedForUser),
                (call, headers) => GraftAccount.GraftConfig.InvokeWithHeaders(call, headers),
                () => GraftAccount.AccountFacade.IsCityAllowedForUser(username, query));

            if (!isAllowed)
            {
                throw new Exception("City is not available for the signed-in user.");
            }

            var forecast = GraftTelemetry.RunGraftCall(
                Logger,
                "WeatherProvider",
                nameof(GraftWeather.WeatherProvider.GetWeatherForecast),
                (call, headers) => GraftWeather.GraftConfig.InvokeWithHeaders(call, headers),
                () => GraftWeather.WeatherProvider.GetWeatherForecast(query, 1, "en"));

            var location = forecast.Location;
            var current = forecast.Current;
            var condition = current.Condition;
            var temperatureF = GraftTelemetry.RunGraftCall(
                Logger,
                "TemperatureFacade",
                nameof(GraftTemperature.TemperatureFacade.ConvertCelsiusToFahrenheit),
                (call, headers) => GraftTemperature.GraftConfig.InvokeWithHeaders(call, headers),
                () => GraftTemperature.TemperatureFacade.ConvertCelsiusToFahrenheit(current.TempC));

            var result = new CityWeather
            {
                City = location.Name,
                Country = location.Country,
                TemperatureC = current.TempC,
                TemperatureF = temperatureF,
                Condition = condition.Text,
                Humidity = current.Humidity,
                WindKph = current.WindKph,
                LastUpdated = current.LastUpdated
            };

            Logger.TrackTrace(nameof(GetWeather), "Weather operation completed.");
            return result;
        }
        catch (Exception exception)
        {
            operation.MarkFailed();
            Logger.TrackException(nameof(GetWeather), exception);
            throw;
        }
    }

    private static string GetAccountServiceHost()
    {
        return Environment.GetEnvironmentVariable("ACCOUNT_SERVICE_GRAFT_HOST")
            ?? "ws://account-service/ws";
    }

    private static string GetTemperatureConversionServiceHost()
    {
        return Environment.GetEnvironmentVariable("TEMPERATURE_CONVERSION_SERVICE_GRAFT_HOST")
            ?? "ws://temperature-conversion-service/ws";
    }
}
