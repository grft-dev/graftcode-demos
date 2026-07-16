export default function WeatherPanel({ weather, loading, error, cityName }) {
  if (!cityName) {
    return (
      <section className="card weather-card empty">
        <p>Select a city to see current weather.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="card weather-card">
        <p className="status">Loading weather for {cityName}...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card weather-card">
        <p className="error">{error}</p>
      </section>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <section className="card weather-card">
      <h2>
        {weather.get_city()} <span>{weather.get_country()}</span>
      </h2>
      <p className="temperature">
        <span>{weather.get_temperatureC()}°C</span>
        <span className="temperature-fahrenheit">{weather.get_temperatureF()}°F</span>
      </p>
      <p className="condition">{weather.get_condition()}</p>
      <dl className="weather-details">
        <div>
          <dt>Humidity</dt>
          <dd>{weather.get_humidity()}%</dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>{weather.get_windKph()} km/h</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{weather.get_lastUpdated()}</dd>
        </div>
      </dl>
    </section>
  );
}
