import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            manifest: {
                name: "STEALTHNET Admin",
                short_name: "StealthNET",
                theme_color: "#0f172a",
                icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
            },
            workbox: {
                navigateFallbackDenylist: [/^\/api\//],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            },
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet") || id.includes("node_modules/@react-leaflet")) return "leaflet";
                    if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) return "recharts";
                    if (id.includes("node_modules/react-force-graph")) return "force-graph";
                    if (id.includes("node_modules/framer-motion")) return "framer";
                },
            },
        },
    },
    resolve: {
        alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
        port: 5173,
        proxy: {
            "/api": { target: "http://localhost:5001", changeOrigin: true },
        },
    },
});
