import path from "node:path";
import type { NextConfig } from "next";

// Статический экспорт: приложение публикуется на общем GitHub Pages репозитория
// под /RNM26/sinoflow/. Локально и на Vercel — в корне.
const isGithubActionsBuild = process.env.GITHUB_ACTIONS === "true";
const basePath = "/RNM26/sinoflow";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Отдельное приложение со своим lockfile внутри общего репозитория.
  turbopack: { root: path.join(__dirname) },
  outputFileTracingRoot: path.join(__dirname),
  ...(isGithubActionsBuild ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
