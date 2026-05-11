import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const buildId =
  process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);

const appVersion = process.env.npm_package_version || "1.0.0";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_BUILD_ID__: JSON.stringify(buildId),
    __APP_BUILD_LABEL__: JSON.stringify(`${appVersion}-${buildId}`),
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
