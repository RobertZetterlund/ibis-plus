import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import path from "path";

export default defineConfig({
  plugins: [preact()],
  root: process.cwd(),
  define: {
    global: "window", // fixes some polyfills
    "process.env": {}, // removes node-env vars
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        content: path.resolve(__dirname, "src/homepage.jsx"),
      },
      output: {
        entryFileNames: "homepage.js",
        format: "iife", // <-- MV3-safe
      },
    },
    minify: false, // Debug-friendly, enable later if you want
  },
});
