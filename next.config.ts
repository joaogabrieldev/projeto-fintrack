import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Gera .next/standalone com um server.js mínimo, usado pela imagem Docker.
  output: "standalone",
};

export default nextConfig;
