import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactCompiler: true, // Does not work with bun runtime 1.3.3 or lower
	allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
