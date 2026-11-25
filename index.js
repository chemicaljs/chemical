import { bootstrap } from "@mercuryworkshop/proxy-bootstrap";
import express from "express";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const swPath = fileURLToPath(new URL("./sw.js", import.meta.url));

const bootstrapConfig = {
  scramjetBundlePath: "/scramjet/scramjet.js",
  scramjetWasmPath: "/scramjet/scramjet.wasm",
  scramjetUtilsBundlePath: "/scramjet/scramjet-utils.js",
};

async function createProxyHandlers() {
  const { routeRequest, routeUpgrade } = await bootstrap(bootstrapConfig);

  function middleware(req, res, next) {
    if (req.url?.split("?")[0] === "/sw.js") {
      fs.readFile(swPath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end("Service Worker not found");
          return;
        }
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        res.end(data);
      });
      return;
    }

    if (routeRequest(req, res)) return;
    next();
  }

  return { middleware, routeUpgrade };
}

export class Chemical {
  constructor(options = {}) {
    this.port = options.port || 8000;
    this.staticDir = options.staticDir || "build";
    this.spaMode = options.spaMode || false;

    this.app = express();
    this.server = http.createServer(this.app);
  }

  async start() {
    const { middleware, routeUpgrade } = await createProxyHandlers();

    this.app.use(middleware);
    this.app.use(express.static(this.staticDir));

    if (this.spaMode) {
      const indexFile = path.resolve(
        process.cwd(),
        this.staticDir,
        "index.html",
      );
      this.app.use((req, res, next) => {
        if (req.method !== "GET") return next();
        res.sendFile(indexFile);
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

async function attachViteServer(server) {
  const { middleware, routeUpgrade } = await createProxyHandlers();
  server.middlewares.use(middleware);
  server.httpServer?.on("upgrade", (req, socket, head) => {
    routeUpgrade(req, socket, head);
  });
}

export const ChemicalVitePlugin = () => ({
  name: "chemical-vite-plugin",
  config() {
    return {
      optimizeDeps: {
        exclude: ["chemicaljs"],
        include: [
          "@mercuryworkshop/scramjet",
          "@mercuryworkshop/scramjet-controller",
          "@mercuryworkshop/scramjet-utils",
        ],
      },
    };
  },
  configureServer: attachViteServer,
  configurePreviewServer: attachViteServer,
});
