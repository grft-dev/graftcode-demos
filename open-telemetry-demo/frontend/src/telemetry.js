import { GraftCodeLogger } from "@graftcode/browser-logger";

class CityWeatherFrontend {}

GraftCodeLogger.init("GraftCodeOpenTelemetryDemoFrontend", {
  connectionString: import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING,
  appServiceName: "GraftCodeOpenTelemetryDemoFrontend",
  enableAutoRouteTracking: true,
});

const logger = GraftCodeLogger.getLogger(CityWeatherFrontend);

export async function runTelemetryOperation(methodName, callback, graftInvocation) {
  const operation = GraftCodeLogger.startOperation(null, methodName);
  GraftCodeLogger.setActiveGraftInvocation(graftInvocation ?? null);
  logger.trackTrace(methodName, "Operation started.");

  try {
    const result = await callback();
    logger.trackTrace(methodName, "Operation completed.");
    return result;
  } catch (caughtError) {
    const error = caughtError instanceof Error
      ? caughtError
      : new Error(String(caughtError));

    operation.markFailed();
    logger.trackException(methodName, error);
    throw caughtError;
  } finally {
    GraftCodeLogger.setActiveGraftInvocation(null);
    operation.dispose();
  }
}
