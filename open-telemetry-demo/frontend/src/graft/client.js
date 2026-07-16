import { GraftConfig as UserGraftConfig, UserAccountService } from "@graft/nuget-userservice";
import { GraftConfig as WeatherGraftConfig, WeatherFacade } from "@graft/nuget-cityweatherservice";
import { runTelemetryOperation } from "../telemetry.js";

UserGraftConfig.host = `${window.location.origin}/users/h2`;
UserGraftConfig.stateless = true;

WeatherGraftConfig.host = `${window.location.origin}/weather/h2`;
WeatherGraftConfig.stateless = true;

export function clearAuthToken() {
  UserGraftConfig.setHeaders({});
  WeatherGraftConfig.setHeaders({});
}

export async function login(username, password) {
  return runTelemetryOperation(
    "login",
    async () => {
      const result = await UserAccountService.login(username, password);
      UserGraftConfig.setHeaders({ Authorization: `Bearer ${result.get_token()}` });
      WeatherGraftConfig.setHeaders({ Authorization: `Bearer ${result.get_token()}` });
      return result;
    },
    {
      graftPackage: UserGraftConfig.graftName,
      service: "UserAccountService",
      method: "Login",
      transport: "h2",
    },
  );
}

export async function getCities() {
  return runTelemetryOperation(
    "getCities",
    () => UserAccountService.getCities(),
    {
      graftPackage: UserGraftConfig.graftName,
      service: "UserAccountService",
      method: "GetCities",
      transport: "h2",
    },
  );
}

export async function getWeather(cityName) {
  const weather = await runTelemetryOperation(
    "getWeather",
    () => WeatherFacade.getWeather(cityName),
    {
      graftPackage: WeatherGraftConfig.graftName,
      service: "WeatherFacade",
      method: "GetWeather",
      transport: "h2",
    },
  );
  return weather;
}
