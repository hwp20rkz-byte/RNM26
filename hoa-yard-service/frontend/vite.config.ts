import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// На GitHub Pages сайт живёт под /<repo>/, а не в корне домена — без base
// все абсолютные ссылки на ассеты (JS/CSS/иконки) вели бы на 404. CI (deploy-pages.yml)
// собирает сборку с GITHUB_PAGES_BASE="/RNM26/"; локальный `npm run dev`/`build` без
// этой переменной работает как обычно, в корне.
const base = process.env.GITHUB_PAGES_BASE ?? "/";

export default defineConfig({
  base,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "HOA Yard Service — Ақмешіт 9",
        short_name: "Двор",
        description: "Сервис эксплуатации и благоустройства территории ЖК",
        theme_color: "#18181B",
        background_color: "#FAFAF9",
        display: "standalone",
        // относительные пути — резолвятся от URL манифеста, работают
        // одинаково и в корне, и под /RNM26/ на GitHub Pages
        start_url: ".",
        scope: ".",
        icons: [
          { src: "icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/tasks/,
            handler: "NetworkFirst",
            options: { cacheName: "tasks-cache", expiration: { maxEntries: 50 } }
          }
        ]
      }
    })
  ],
  server: { port: 5173 }
});
