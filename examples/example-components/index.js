import { ChemicalServer } from "chemicaljs";
import express from "express";

const [app, listen] = new ChemicalServer();
const port = process.env.PORT || 3000;

app.use(express.static("public", {
    index: "index.html",
    extensions: ["html"]
}));

app.serveChemical();

listen(port, () => {
    console.log(`Chemical example components listening on port ${port}`);
});