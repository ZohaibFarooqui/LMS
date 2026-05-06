import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["apps.d-tech.com.pk", "10.0.0.120", "http://163.61.91.221:8001", "https://hrms.sysnovix.com/"],
  async rewrites() {
    // BACKEND_URL is the server-side proxy target — must be a locally
    // reachable address (not a public domain that loops through NAT).
    const backendUrl =
      process.env.BACKEND_URL || "http://163.61.91.221:8001";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
