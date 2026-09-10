import type { NextConfig } from "next";

// GitHub Pages serves this repo at https://<owner>.github.io/RNM26/, so the
// production (Actions) build needs a basePath/assetPrefix — local `npm run
// dev` and Vercel-style deploys stay unaffected since GITHUB_ACTIONS is only
// set inside GitHub's own runners.
const isGithubActionsBuild = process.env.GITHUB_ACTIONS === "true";
const repoBasePath = "/RNM26";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isGithubActionsBuild
    ? { basePath: repoBasePath, assetPrefix: repoBasePath }
    : {}),
};

export default nextConfig;
