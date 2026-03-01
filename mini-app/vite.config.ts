import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    },
    extensions: [".ts", ".tsx", ".mjs", ".js", ".jsx", ".json"]
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT ?? 4173),
    allowedHosts: true
  }
});
