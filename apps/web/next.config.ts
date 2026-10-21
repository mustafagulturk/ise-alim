import type { NextConfig } from "next";

const api = process.env.API_URL ?? "http://localhost:4000";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Tarayıcı API'ye aynı kökten gider; yenileme çerezi (httpOnly) bu sayede üçüncü taraf çerezi sayılmaz.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default config;
