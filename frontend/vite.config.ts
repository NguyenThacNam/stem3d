/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Máy dev: `npm run dev` (cổng 5173) chuyển /api, /ws, /content (file mô hình GLB) sang Nginx ở cổng 8080
// (docker compose).
// Trình duyệt chỉ thấy một địa chỉ nên cookie refresh (Path=/api/auth) vẫn hoạt động.
const NGINX_DEV = "http://localhost:8080";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: NGINX_DEV },
      "/ws": { target: NGINX_DEV, ws: true },
      "/content": { target: NGINX_DEV },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
