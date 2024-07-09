import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import express from "express";
import wisp from "wisp-server-node";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { scramjetPath } from "@mercuryworkshop/scramjet";
import createRammerhead from "rammerhead/src/server/index.js";

class ChemicalServer {
    constructor(options) {
        if (typeof options !== "object" || Array.isArray(options)) {
            options = {}
            console.error("Error: ChemicalServer options invalid.")
        }

        const rh = createRammerhead()

        const rammerheadScopes = [
            "/rammerhead.js",
            "/hammerhead.js",
            "/transport-worker.js",
            "/task.js",
            "/iframe-task.js",
            "/worker-hammerhead.js",
            "/messaging",
            "/sessionexists",
            "/deletesession",
            "/newsession",
            "/editsession",
            "/needpassword",
            "/syncLocalStorage",
            "/api/shuffleDict"
        ]

        const rammerheadSession = /^\/[a-z0-9]{32}/

        const shouldRouteRh = req => {
            const url = new URL(req.url, "http://0.0.0.0")
            return (
                rammerheadScopes.includes(url.pathname) ||
                rammerheadSession.test(url.pathname)
            )
        }

        const routeRhRequest = (req, res) => {
            rh.emit("request", req, res)
        }

        const routeRhUpgrade = (req, socket, head) => {
            rh.emit("upgrade", req, socket, head)
        }

        this.server = createServer();
        this.app = express();
        this.app.get("/chemical.js", async function (req, res) {
            let chemicalMain = await readFileSync(resolve(import.meta.dirname, "client/chemical.js"), "utf8");

            if (options.default) {
                if (["uv", "rammerhead", "scramjet"].includes(options.default)) {
                    chemicalMain = `const defaultService = "${options.default}";\n\n` + chemicalMain
                } else {
                    chemicalMain = `const defaultService = "uv";\n\n` + chemicalMain
                    console.error("Error: Chemical default option invalid.")
                }
            }

            if (options.uv == false) {
                chemicalMain = "const uvEnabled = false;\n" + chemicalMain
            } else {
                chemicalMain = "const uvEnabled = true;\n" + chemicalMain
            }
            if (options.scramjet == false) {
                chemicalMain = "const scramjetEnabled = false;\n" + chemicalMain
            } else {
                chemicalMain = "const scramjetEnabled = true;\n" + chemicalMain
            }
            if (options.rammerhead == false) {
                chemicalMain = "const rammerheadEnabled = false;\n" + chemicalMain
            } else {
                chemicalMain = "const rammerheadEnabled = true;\n" + chemicalMain
            }

            res.type("application/javascript");
            return res.send(chemicalMain);
        });
        this.app.get("/chemical.sw.js", async function (req, res) {
            let chemicalSW = await readFileSync(resolve(import.meta.dirname, "client/chemical.sw.js"), "utf8");

            if (options.uv == false) {
                chemicalSW = "const uvEnabled = false;\n\n" + chemicalSW
            } else {
                chemicalSW = "const uvEnabled = true;\n\n" + chemicalSW
            }
            if (options.scramjet == false) {
                chemicalSW = "const scramjetEnabled = false;\n" + chemicalSW
            } else {
                chemicalSW = "const scramjetEnabled = true;\n" + chemicalSW
            }
            if (options.rammerhead == false) {
                chemicalSW = "const rammerheadEnabled = false;\n" + chemicalSW
            } else {
                chemicalSW = "const rammerheadEnabled = true;\n" + chemicalSW
            }

            res.type("application/javascript");
            return res.send(chemicalSW);
        });
        this.app.use(express.static(resolve(import.meta.dirname, "client")));
        this.app.use("/baremux/", express.static(baremuxPath));
        this.app.use("/epoxy/", express.static(epoxyPath));
        if (options.uv !== false) {
            this.app.use("/uv/", express.static(resolve(import.meta.dirname, "config/uv")));
            this.app.use("/uv/", express.static(uvPath));
        }
        if (options.scramjet !== false) {
            this.app.use("/scramjet/", express.static(resolve(import.meta.dirname, "config/scramjet")));
            this.app.use("/scramjet/", express.static(scramjetPath));
        }
        this.server.on("request", (req, res) => {
            if (options.rammerhead !== false && shouldRouteRh(req)) {
                routeRhRequest(req, res);
            } else {
                this.app(req, res);
            }
        });
        this.server.on("upgrade", (req, socket, head) => {
            if (req.url && req.url.endsWith("/wisp/")) {
                wisp.routeRequest(req, socket, head);
            } else if (options.rammerhead !== false && shouldRouteRh(req)) {
                routeRhUpgrade(req, socket, head);
            } else {
                socket.end();
            }
        });
    }
}

export { ChemicalServer };