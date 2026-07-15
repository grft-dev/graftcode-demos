import { useEffect, useState } from "react";
import CityList from "./components/CityList.jsx";
import LoginForm from "./components/LoginForm.jsx";
import WeatherPanel from "./components/WeatherPanel.jsx";
import { clearAuthToken, getCities, getWeather } from "./graft/client.js";
import "./App.css";

export default function App() {
  const [session, setSession] = useState(null);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    async function loadCities() {
      setCitiesLoading(true);
      setCitiesError("");

      try {
        const cityList = await getCities();
        if (cancelled) {
          return;
        }

        setCities(Array.isArray(cityList) ? cityList : []);
        if (cityList.length > 0) {
          setSelectedCity(cityList[0]);
        }
      } catch (loadError) {
        if (!cancelled) {
          setCitiesError(loadError?.message ?? String(loadError));
        }
      } finally {
        if (!cancelled) {
          setCitiesLoading(false);
        }
      }
    }

    loadCities();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session || !selectedCity) {
      return;
    }

    let cancelled = false;

    async function loadWeather() {
      setWeather(null);
      setWeatherLoading(true);
      setWeatherError("");

      try {
        const result = await getWeather(selectedCity);
        if (!cancelled) {
          setWeather(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setWeatherError(loadError?.message ?? String(loadError));
        }
      } finally {
        if (!cancelled) {
          setWeatherLoading(false);
        }
      }
    }

    loadWeather();

    return () => {
      cancelled = true;
    };
  }, [session, selectedCity]);

  function handleLogout() {
    clearAuthToken();
    setSession(null);
    setCities([]);
    setSelectedCity("");
    setWeather(null);
    setCitiesError("");
    setWeatherError("");
  }

  if (!session) {
    return (
      <main className="app-shell">
        <LoginForm onLogin={setSession} />
      </main>
    );
  }

  return (
    <main className="app-shell dashboard">
      <header className="top-bar">
        <div>
          <h1>City Weather</h1>
          <p>Signed in as {session.username}</p>
        </div>
        <button type="button" className="secondary" onClick={handleLogout}>
          Sign out
        </button>
      </header>

      <div className="dashboard-grid">
        <CityList
          cities={cities}
          selectedCity={selectedCity}
          onSelect={setSelectedCity}
          loading={citiesLoading}
          error={citiesError}
        />
        <WeatherPanel
          weather={weather}
          loading={weatherLoading}
          error={weatherError}
          cityName={selectedCity}
        />
      </div>
    </main>
  );
}
