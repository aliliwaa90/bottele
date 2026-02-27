var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var _a;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
var railwayHost = process.env.RAILWAY_PUBLIC_DOMAIN;
var allowedHosts = __spreadArray([
    "localhost",
    "127.0.0.1",
    "vaulttapmini-app-production.up.railway.app"
], (railwayHost ? [railwayHost] : []), true);
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
        allowedHosts: allowedHosts
    },
    preview: {
        host: "0.0.0.0",
        port: Number((_a = process.env.PORT) !== null && _a !== void 0 ? _a : 4173),
        allowedHosts: allowedHosts
    }
});
