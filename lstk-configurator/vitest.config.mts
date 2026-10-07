import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Пустой PostCSS — не подхватывать конфиги выше по дереву
  css: { postcss: {} },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
