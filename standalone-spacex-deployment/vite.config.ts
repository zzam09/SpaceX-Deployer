import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { glob } from "glob";

const port = Number(process.env.PORT || 3000);
const basePath = process.env.BASE_PATH || "/";

// Dynamically generate entry points for multi-page app
const input = {
  main: path.resolve(import.meta.dirname, "index.html"),
  ...Object.fromEntries(
    glob
      .sync("pages/**/*.html", { cwd: import.meta.dirname })
      .map((file) => [
        file.replace(/\.html$/, ""),
        path.resolve(import.meta.dirname, file),
      ])
  ),
};

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input,
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
  },
  preview: {
    port,
    host: "0.0.0.0",
  },
});
