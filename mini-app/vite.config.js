var _a;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
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
        allowedHosts: true
    },
    preview: {
        host: "0.0.0.0",
        port: Number((_a = process.env.PORT) !== null && _a !== void 0 ? _a : 4173),
        allowedHosts: true
    }
});
