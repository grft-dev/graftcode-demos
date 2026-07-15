using CityWeatherService.Internal;
using CityWeatherService.Models;
using GraftWeather = graft.nuget.WeatherService;

namespace CityWeatherService;

public static class WeatherFacade
{
    static WeatherFacade()
    {
        GraftWeather.GraftConfig.Host = "wss://dotnetweatherapi.onrender.com/ws";
        GraftWeather.GraftConfig.Stateless = true;
    }

    public static CityWeather GetWeather(string cityName)
    {
        JwtHelper.EnsureAuthenticated();

        if (string.IsNullOrWhiteSpace(cityName))
        {
            throw new Exception("City name is required.");
        }

        var query = cityName.Trim();
        var forecast = GraftWeather.WeatherProvider.GetWeatherForecast(query, 1, "en");

        var location = forecast.location;
        var current = forecast.current;
        var condition = current.condition;

        return new CityWeather
        {
            City = location.name,
            Country = location.country,
            TemperatureC = current.temp_c,
            Condition = condition.text,
            Humidity = current.humidity,
            WindKph = current.wind_kph,
            LastUpdated = current.last_updated
        };
    }
}
