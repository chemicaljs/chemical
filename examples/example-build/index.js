import { ChemicalServer } from "chemicaljs";
import express from "express";

const chemical = new ChemicalServer({
    rammerhead: false,
});
const port = process.env.PORT || 3000;

chemical.use(express.static("public", {
    index: "index.html",
    extensions: ["html"]
}));

chemical.listen(port, () => {
    console.log(`Chemical example build listening on port ${port}`);
});