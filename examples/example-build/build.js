import { ChemicalBuild } from "chemicaljs";

const build = new ChemicalBuild({
    path: "dist",
    default: "uv",
    uv: true,
    scramjet: true,
    rammerhead: false,
});

await build.write(true);

console.log("Built!")