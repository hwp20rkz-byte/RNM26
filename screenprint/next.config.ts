import path from "node:path";
import type { NextConfig } from "next";

// Pages-сайт репозитория общий (QazaqOSI в корне, рядом HOA, ЛСТК и др.).
// В Actions-сборке приложение живёт под /RNM26/screenprint/; локально — в корне.
// CRM с Prisma (этап 5) потребует серверного хостинга; до тех пор — статический экспорт.
const isGithubActionsBuild = process.env.GITHUB_ACTIONS === "true";
const basePath = "/RNM26/screenprint";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ["three"],
  turbopack: { root: path.join(__dirname) },
  outputFileTracingRoot: path.join(__dirname),
  ...(isGithubActionsBuild ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
