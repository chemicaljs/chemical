import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import express from "express";
import wisp from "wisp-server-node";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { scramjetPath } from "@mercuryworkshop/scramjet";
import createRammerhead from "rammerhead/src/server/index.js";

const __dirname = new URL(".", import.meta.url).pathname;

class ChemicalServer {
    constructor(options) {
        if (options) {
            if (typeof options !== "object" || Array.isArray(options)) {
                options = {}
                console.error("Error: ChemicalServer options invalid.")
            }
        } else {
            options = {}
        }

        if (options.uv == undefined) {
            options.uv = true;
        }

        if (options.scramjet == undefined) {
            options.scramjet = true;
        }

        if (options.rammerhead == undefined) {
            options.rammerhead = true;
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
            let chemicalMain = await readFileSync(resolve(__dirname, "client/chemical.js"), "utf8");

            if (options.default) {
                if (["uv", "rammerhead", "scramjet"].includes(options.default)) {
                    chemicalMain = `const defaultService = "${options.default}";\n\n` + chemicalMain
                } else {
                    chemicalMain = `const defaultService = "uv";\n\n` + chemicalMain
                    console.error("Error: Chemical default option invalid.")
                }
            } else {
                chemicalMain = `const defaultService = "uv";\n\n` + chemicalMain;
            }

            chemicalMain = "const uvEnabled = " + String(options.uv) + ";\n" + chemicalMain
            chemicalMain = "const scramjetEnabled = " + String(options.scramjet) + ";\n" + chemicalMain
            chemicalMain = "const rammerheadEnabled = " + String(options.rammerhead) + ";\n" + chemicalMain

            res.type("application/javascript");
            return res.send(chemicalMain);
        });
        this.app.get("/chemical.sw.js", async function (req, res) {
            let chemicalSW = await readFileSync(resolve(__dirname, "client/chemical.sw.js"), "utf8");

            chemicalSW = "const uvEnabled = " + String(options.uv) + ";\n" + chemicalSW
            chemicalSW = "const scramjetEnabled = " + String(options.scramjet) + ";\n" + chemicalSW
            chemicalSW = "const rammerheadEnabled = " + String(options.rammerhead) + ";\n" + chemicalSW

            res.type("application/javascript");
            return res.send(chemicalSW);
        });
        this.app.use(express.static(resolve(__dirname, "client")));
        this.app.use("/baremux/", express.static(baremuxPath));
        this.app.use("/libcurl/", express.static(libcurlPath));
        this.app.use("/epoxy/", express.static(epoxyPath));
        if (options.uv) {
            this.app.use("/uv/", express.static(resolve(__dirname, "config/uv")));
            this.app.use("/uv/", express.static(uvPath));
        }
        if (options.scramjet) {
            this.app.use("/scramjet/", express.static(resolve(__dirname, "config/scramjet")));
            this.app.use("/scramjet/", express.static(scramjetPath));
        }
        this.server.on("request", (req, res) => {
            if (options.rammerhead && shouldRouteRh(req)) {
                routeRhRequest(req, res);
            } else {
                this.app(req, res);
            }
        });
        this.server.on("upgrade", (req, socket, head) => {
            if (req.url && req.url.endsWith("/wisp/")) {
                wisp.routeRequest(req, socket, head);
            } else if (options.rammerhead && shouldRouteRh(req)) {
                routeRhUpgrade(req, socket, head);
            } else {
                socket.end();
            }
        });
    }
}

const ChemicalVitePlugin = (options) => ({
    name: "chemical-vite-plugin",
    configureServer(server) {
        if (options) {
            if (typeof options !== "object" || Array.isArray(options)) {
                options = {}
                console.error("Error: ChemicalServer options invalid.")
            }
        } else {
            options = {}
        }

        if (options.uv == undefined) {
            options.uv = true;
        }

        if (options.scramjet == undefined) {
            options.scramjet = true;
        }

        if (options.rammerhead == undefined) {
            options.rammerhead = true;
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

        const app = express();
        app.get("/chemical.js", async function (req, res) {
            let chemicalMain = await readFileSync(resolve(__dirname, "client/chemical.js"), "utf8");

            if (options.default) {
                if (["uv", "rammerhead", "scramjet"].includes(options.default)) {
                    chemicalMain = `const defaultService = "${options.default}";\n\n` + chemicalMain
                } else {
                    chemicalMain = `const defaultService = "uv";\n\n` + chemicalMain
                    console.error("Error: Chemical default option invalid.")
                }
            } else {
                chemicalMain = `const defaultService = "uv";\n\n` + chemicalMain;
            }

            chemicalMain = "const uvEnabled = " + String(options.uv) + ";\n" + chemicalMain
            chemicalMain = "const scramjetEnabled = " + String(options.scramjet) + ";\n" + chemicalMain
            chemicalMain = "const rammerheadEnabled = " + String(options.rammerhead) + ";\n" + chemicalMain

            res.type("application/javascript");
            return res.send(chemicalMain);
        });
        app.get("/chemical.sw.js", async function (req, res) {
            let chemicalSW = await readFileSync(resolve(__dirname, "client/chemical.sw.js"), "utf8");

            chemicalSW = "const uvEnabled = " + String(options.uv) + ";\n" + chemicalSW
            chemicalSW = "const scramjetEnabled = " + String(options.scramjet) + ";\n" + chemicalSW
            chemicalSW = "const rammerheadEnabled = " + String(options.rammerhead) + ";\n" + chemicalSW

            res.type("application/javascript");
            return res.send(chemicalSW);
        });
        app.use(express.static(resolve(__dirname, "client")));
        app.use("/baremux/", express.static(baremuxPath));
        app.use("/libcurl/", express.static(libcurlPath));
        app.use("/epoxy/", express.static(epoxyPath));
        if (options.uv) {
            app.use("/uv/", express.static(resolve(__dirname, "config/uv")));
            app.use("/uv/", express.static(uvPath));
        }
        if (options.scramjet) {
            app.use("/scramjet/", express.static(resolve(__dirname, "config/scramjet")));
            app.use("/scramjet/", express.static(scramjetPath));
        }

        server.middlewares.use(app);

        server.middlewares.use((req, res, next) => {
            if (options.rammerhead && shouldRouteRh(req)) {
                routeRhRequest(req, res);
            } else {
                next();
            }
        });

        const upgraders = server.httpServer.listeners("upgrade")

        for (const upgrader of upgraders) {
            server.httpServer.off("upgrade", upgrader)
        }

        server.httpServer.on("upgrade", (req, socket, head) => {
            if (req.url && req.url.endsWith("/wisp/")) {
                wisp.routeRequest(req, socket, head)
            } else if (options.rammerhead && shouldRouteRh(req)) {
                routeRhUpgrade(req, socket, head)
            } else {
                for (const upgrader of upgraders) {
                    upgrader(req, socket, head)
                }
            }
        })
    }
})

export { ChemicalServer, ChemicalVitePlugin };