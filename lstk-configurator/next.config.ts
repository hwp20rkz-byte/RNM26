import path from "node:path";
import type { NextConfig } from "next";

// Pages-сайт репозитория общий (QazaqOSI в корне, рядом HOA и бизнес-план ЛСТК).
// В Actions-сборке приложение живёт под /RNM26/lstk-configurator/; локально — в корне.
const isGithubActionsBuild = process.env.GITHUB_ACTIONS === "true";
const basePath = "/RNM26/lstk-configurator";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Отдельное приложение со своим lockfile внутри чужого репозитория — корень
  // явно, иначе Next выбирает корень репозитория (lockfile QazaqOSI).
  turbopack: { root: path.join(__dirname) },
  outputFileTracingRoot: path.join(__dirname),
  ...(isGithubActionsBuild ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
