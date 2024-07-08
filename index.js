import { resolve } from "node:path";
import { createServer } from "node:http";
import express from "express";
import wisp from "wisp-server-node";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";

class ChemicalServer {
    constructor() {
        this.server = createServer();
        this.app = express();
        this.app.use(express.static(resolve(import.meta.dirname, "public")));
        this.app.use("/baremux/", express.static(baremuxPath));
        this.app.use("/epoxy/", express.static(epoxyPath));
        this.app.use("/uv/", express.static(uvPath));
        this.server.on("request", (req, res) => {
            this.app(req, res);
        });
        this.server.on("upgrade", (req, socket, head) => {
            if (req.url && req.url.endsWith("/wisp/")) {
                wisp.routeRequest(req, socket, head);
            } else {
                socket.end();
            }
        });
    }
}

export { ChemicalServer };