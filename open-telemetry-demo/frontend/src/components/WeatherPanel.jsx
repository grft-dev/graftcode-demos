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
        {weather.get_City()} <span>{weather.get_Country()}</span>
      </h2>
      <p className="temperature">{weather.get_TemperatureC()}°C</p>
      <p className="condition">{weather.get_Condition()}</p>
      <dl className="weather-details">
        <div>
          <dt>Humidity</dt>
          <dd>{weather.get_Humidity()}%</dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>{weather.get_WindKph()} km/h</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{weather.get_LastUpdated()}</dd>
        </div>
      </dl>
    </section>
  );
}
