import http2 from "node:http2";

const USER_NPM_URL = "http://localhost:8080/npm";
const WEATHER_NPM_URL = "http://localhost:8081/npm";

const FORBIDDEN_H2_REQUEST_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
  "host",
  "http2-settings",
]);

const H2C_UPSTREAMS = {
  "/users/h2": "http://localhost:8989",
  "/weather/h2": "http://localhost:8990",
};

function buildH2RequestHeaders(req, alias) {
  let remainder = req.url.slice(alias.length);
  if (remainder === "/") {
    remainder = "";
  }

  return {
    ":method": req.method || "GET",
    ":path": `/h2${remainder}`,
    ...Object.fromEntries(
      Object.entries(req.headers)
        .filter(
          ([key]) =>
            !FORBIDDEN_H2_REQUEST_HEADERS.has(key.toLowerCase()) &&
            !key.startsWith(":")
        )
        .map(([key, value]) => [key.toLowerCase(), value])
    ),
  };
}

function buildHttp1ResponseHeaders(h2Headers) {
  return Object.fromEntries(
    Object.entries(h2Headers).filter(([key]) => !key.startsWith(":"))
  );
}

function h2cProxy() {
  return {
    name: "graft-h2c-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const alias = Object.keys(H2C_UPSTREAMS).find((entry) =>
          req.url?.startsWith(entry)
        );
        if (!alias) {
          return next();
        }

        const client = http2.connect(H2C_UPSTREAMS[alias]);
        const upstream = client.request(buildH2RequestHeaders(req, alias));
        req.pipe(upstream);

        upstream.on("response", (headers) => {
          res.writeHead(headers[":status"] || 200, buildHttp1ResponseHeaders(headers));
          upstream.pipe(res);
        });

        upstream.on("error", (error) => {
          res.statusCode = 502;
          res.end(String(error));
          client.close();
        });

        res.on("close", () => client.close());
      });
    },
  };
}

export { USER_NPM_URL, WEATHER_NPM_URL, h2cProxy };
