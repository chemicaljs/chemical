import { defineConfig } from "vite"
import preact from "@preact/preset-vite"
import { ChemicalPluginVite } from "chemicaljs"

export default defineConfig({
    plugins: [
        preact(),
        ChemicalPluginVite()
    ],
})
