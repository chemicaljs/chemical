import { bootstrap } from "@mercuryworkshop/proxy-bootstrap";
import express from "express";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const swPath = fileURLToPath(new URL("./sw.js", import.meta.url));

export class Chemical {
  constructor(options = {}) {
    this.port = options.port || 8000;
    this.staticDir = options.staticDir || "build";
    this.spaMode = options.spaMode || false;

    this.app = express();
    this.server = http.createServer(this.app);
  }

  async start() {
    const { routeRequest, routeUpgrade } = await bootstrap({
      scramjetBundlePath: "/scramjet/scramjet.js",
      scramjetWasmPath: "/scramjet/scramjet.wasm",
      scramjetUtilsBundlePath: "/scramjet/scramjet-utils.js",
    });

    this.app.use((req, res, next) => {
      if (routeRequest(req, res)) {
        return;
      }
      next();
    });

    this.app.get("/sw.js", (req, res) => {
      res.sendFile(swPath);
    });

    this.app.use(express.static(this.staticDir));

    if (this.spaMode) {
      this.app.get("*", (req, res) => {
        res.sendFile(path.resolve(process.cwd(), this.staticDir, "index.html"));
      });
    }

    this.server.on("upgrade", (req, socket, head) => {
      routeUpgrade(req, socket, head);
    });

    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`Running on http://localhost:${this.port}`);
        resolve(this.server);
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log("Server stopped");
    }
  }
}

export const ChemicalVitePlugin = () => ({
  name: "chemical-vite-plugin",
  config() {
    return {
      optimizeDeps: {
        include: [
          "@mercuryworkshop/scramjet",
          "@mercuryworkshop/scramjet-controller",
          "@mercuryworkshop/proxy-bootstrap",
        ],
      },
    };
  },
  async configureServer(server) {
    const { routeRequest, routeUpgrade } = await bootstrap({
      scramjetBundlePath: "/scramjet/scramjet.js",
      scramjetWasmPath: "/scramjet/scramjet.wasm",
      scramjetUtilsBundlePath: "/scramjet/scramjet-utils.js",
    });

    server.middlewares.use((req, res, next) => {
      const urlPath = req.url.split("?")[0];

      if (urlPath === "/sw.js") {
        fs.readFile(swPath, (err, data) => {
          if (err) {
            res.statusCode = 404;
            res.end("Service Worker not found");
            return;
          }
          res.setHeader("Content-Type", "application/javascript");
          res.end(data);
        });
        return;
      }

      if (routeRequest(req, res)) {
        return;
      }

      next();
    });

    if (server.httpServer) {
      server.httpServer.on("upgrade", (req, socket, head) => {
        routeUpgrade(req, socket, head);
      });
    }
  },
});
