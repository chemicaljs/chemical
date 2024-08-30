import { ChemicalServer } from "chemicaljs";
import express from "express";

const [app, listen] = new ChemicalServer();
const port = process.env.PORT || 3000;

app.use(express.static("dist", {
    index: "index.html",
    extensions: ["html"]
}));

app.serveChemical();

listen(port, () => {
    console.log(`Chemical example vite listening on port ${port}`);
});