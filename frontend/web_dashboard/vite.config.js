import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": {},
  },
  server: {
    proxy: {
      "/apiface": {
        target: "http://64.235.45.24:4998",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/apiface/, ""),
      },
    },
  },
});
