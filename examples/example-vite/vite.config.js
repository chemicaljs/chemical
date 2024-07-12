import { defineConfig } from "vite"
import preact from "@preact/preset-vite"
import { ChemicalVitePlugin } from "chemicaljs"

export default defineConfig({
    plugins: [
        preact(),
        ChemicalVitePlugin()
    ],
})
