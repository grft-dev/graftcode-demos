namespace CityWeatherService.Models;

public class CityWeather
{
    public string City { get; set; } = string.Empty;

    public string Country { get; set; } = string.Empty;

    public double TemperatureC { get; set; }

    public string Condition { get; set; } = string.Empty;

    public int Humidity { get; set; }

    public double WindKph { get; set; }

    public string LastUpdated { get; set; } = string.Empty;
}
