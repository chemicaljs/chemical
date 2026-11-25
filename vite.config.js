import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { ChemicalVitePlugin } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: "dev",
  plugins: [
    svelte({
      configFile: false,
    }),
    ChemicalVitePlugin(),
  ],
  resolve: {
    alias: {
      "chemicaljs/Chemical": path.resolve(__dirname, "Chemical.svelte"),
      "chemicaljs/Frame": path.resolve(__dirname, "Frame.svelte"),
      "chemicaljs/Autocomplete": path.resolve(__dirname, "Autocomplete.svelte"),
      "chemicaljs/tabs": path.resolve(__dirname, "tabs/index.js"),
      "chemicaljs/searchEngines": path.resolve(__dirname, "searchEngines.js"),
      "chemicaljs/AdblockPlugin": path.resolve(__dirname, "AdblockPlugin.js"),
      "chemicaljs/InternalUrlsPlugin": path.resolve(
        __dirname,
        "InternalUrlsPlugin.js",
      ),
      chemicaljs: path.resolve(__dirname, "index.js"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "../build",
    emptyOutDir: true,
  },
});
