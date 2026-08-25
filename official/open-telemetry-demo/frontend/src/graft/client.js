import { GraftConfig as UserGraftConfig, UserAccountService } from "@graft/nuget-userservice";
import { GraftConfig as WeatherGraftConfig, WeatherFacade } from "@graft/nuget-cityweatherservice";

UserGraftConfig.host = `${window.location.origin}/users/h2`;
UserGraftConfig.stateless = true;

WeatherGraftConfig.host = `${window.location.origin}/weather/h2`;
WeatherGraftConfig.stateless = true;

export function clearAuthToken() {
  UserGraftConfig.setHeaders({});
  WeatherGraftConfig.setHeaders({});
}

export async function login(username, password) {
  const result = await UserAccountService.Login(username, password);
  UserGraftConfig.setHeaders({ Authorization: `Bearer ${result.get_Token()}` });
  WeatherGraftConfig.setHeaders({ Authorization: `Bearer ${result.get_Token()}` });
  return result;
}

export async function getCities() {
  return UserAccountService.GetCities();
}

export async function getWeather(cityName) {
  return WeatherFacade.GetWeather(cityName);
}
