import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { ChemicalVitePlugin } from "../index.js";

export default defineConfig({
  plugins: [svelte(), ChemicalVitePlugin()],
});
