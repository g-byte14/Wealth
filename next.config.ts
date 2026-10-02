import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship the methodology folder with the server functions so it can be read at runtime.
  outputFileTracingIncludes: {
    "/api/**": ["./methodology/**/*"],
  },
};

export default nextConfig;
