import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  compiler: {
    removeConsole: {
      exclude: [], // removes EVERYTHING including errors
    },
  },
};

export default nextConfig;


