import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

const railwayHost = process.env.RAILWAY_PUBLIC_DOMAIN;

const allowedHosts = [
  "localhost",
  "127.0.0.1",
  "vaulttapmini-app-production.up.railway.app",
  ...(railwayHost ? [railwayHost] : [])
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT ?? 4173),
    allowedHosts
  }
});
