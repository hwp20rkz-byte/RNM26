/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Pages-сайт репозитория общий: корень занят QazaqOSI, рядом /hoa-yard-service/.
// CI (deploy-pages.yml в корне) собирает с GITHUB_PAGES_BASE="/RNM26/lstk-business-plan/";
// локально без переменной приложение работает из корня.
const base = process.env.GITHUB_PAGES_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  // Пустой inline-конфиг не даёт Vite подхватить postcss.config.mjs из корня
  // репозитория (Tailwind QazaqOSI) — у этого приложения свой CSS на токенах.
  css: { postcss: {} },
  server: { port: 5174 },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node"
  }
});
