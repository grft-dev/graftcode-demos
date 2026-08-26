export default function CityList({ cities, selectedCity, onSelect, loading, error }) {
  if (loading) {
    return <p className="status">Loading your cities...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <section className="card">
      <h2>Your cities</h2>
      <ul className="city-list">
        {cities.map((city) => (
          <li key={city}>
            <button
              type="button"
              className={selectedCity === city ? "city-button active" : "city-button"}
              onClick={() => onSelect(city)}
            >
              {city}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
