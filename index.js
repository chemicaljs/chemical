import { resolve } from "node:path";
import { createServer } from "node:http";
import express from "express";
import wisp from "wisp-server-node";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { scramjetPath } from "@mercuryworkshop/scramjet";
import createRammerhead from "rammerhead/src/server/index.js";

class ChemicalServer {
    constructor() {
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
        this.app.use(express.static(resolve(import.meta.dirname, "client")));
        this.app.use("/baremux/", express.static(baremuxPath));
        this.app.use("/epoxy/", express.static(epoxyPath));
        this.app.use("/uv/", express.static(uvPath));
        this.app.use("/scramjet/", express.static(scramjetPath));
        this.server.on("request", (req, res) => {
            if (shouldRouteRh(req)) {
                routeRhRequest(req, res);
            } else {
                this.app(req, res);
            }
        });
        this.server.on("upgrade", (req, socket, head) => {
            if (req.url && req.url.endsWith("/wisp/")) {
                wisp.routeRequest(req, socket, head);
            } else if (shouldRouteRh(req)) {
                routeRhUpgrade(req, socket, head);
            } else {
                socket.end();
            }
        });
    }
}

export { ChemicalServer };