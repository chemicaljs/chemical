import { resolve, dirname } from "node:path";
import {
  readFileSync,
  cpSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import express from "express";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { scramjetPath } from "./scramjet/index.js";
import createRammerhead from "rammerhead/src/server/index.js";
const __dirname = dirname(fileURLToPath(import.meta.url));

logging.set_level(logging.ERROR);

class ChemicalServer {
  constructor(options) {
    if (options) {
      if (typeof options !== "object" || Array.isArray(options)) {
        options = {};
        console.error("Error: ChemicalServer options invalid.");
      }
    } else {
      options = {};
    }

    if (options.uv === undefined) {
      options.uv = true;
    }

    if (options.scramjet === undefined) {
      options.scramjet = true;
    }

    if (options.rammerhead === undefined) {
      options.rammerhead = true;
    }

    if (options.demoMode === undefined) {
      options.demoMode = false;
    }

    this.options = options;
    this.server = createServer();
    this.app = express();
    this.app.serveChemical = this.serveChemical;

    return [this.app, this.listen];
  }
  serveChemical = () => {
    const rh = createRammerhead();
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
      "/api/shuffleDict",
    ];
    const rammerheadSession = /^\/[a-z0-9]{32}/;
    const shouldRouteRh = (req) => {
      const url = new URL(req.url, "http://0.0.0.0");
      return (
        rammerheadScopes.includes(url.pathname) ||
        rammerheadSession.test(url.pathname)
      );
    };
    const routeRhRequest = (req, res) => {
      rh.emit("request", req, res);
    };
    const routeRhUpgrade = (req, socket, head) => {
      rh.emit("upgrade", req, socket, head);
    };

    this.app.get("/chemical.js", async (req, res) => {
      let chemicalMain = await readFileSync(
        resolve(__dirname, "client/chemical.js"),
        "utf8"
      );

      if (this.options.default) {
        if (["uv", "rammerhead", "scramjet"].includes(this.options.default)) {
          chemicalMain =
            `const defaultService = "${this.options.default}";\n\n` +
            chemicalMain;
        } else {
          chemicalMain = `const defaultService = "uv";\n\n` + chemicalMain;
          console.error("Error: Chemical default option invalid.");
        }
      } else {
        chemicalMain = `const defaultService = "uv";\n\n` + chemicalMain;
      }

      chemicalMain =
        "const uvEnabled = " + String(this.options.uv) + ";\n" + chemicalMain;
      chemicalMain =
        "const scramjetEnabled = " +
        String(this.options.scramjet) +
        ";\n" +
        chemicalMain;
      chemicalMain =
        "const rammerheadEnabled = " +
        String(this.options.rammerhead) +
        ";\n" +
        chemicalMain;
      chemicalMain =
        "const demoMode = " +
        String(this.options.demoMode) +
        ";\n" +
        chemicalMain;

      chemicalMain = "(async () => {\n" + chemicalMain + "\n})();";

      res.type("application/javascript");
      return res.send(chemicalMain);
    });
    this.app.get("/chemical.sw.js", async (req, res) => {
      let chemicalSW = await readFileSync(
        resolve(__dirname, "client/chemical.sw.js"),
        "utf8"
      );

      chemicalSW =
        "const uvEnabled = " + String(this.options.uv) + ";\n" + chemicalSW;
      chemicalSW =
        "const scramjetEnabled = " +
        String(this.options.scramjet) +
        ";\n" +
        chemicalSW;
      chemicalSW =
        "const rammerheadEnabled = " +
        String(this.options.rammerhead) +
        ";\n" +
        chemicalSW;

      res.type("application/javascript");
      return res.send(chemicalSW);
    });
    this.app.use(express.static(resolve(__dirname, "client")));
    this.app.use("/baremux/", express.static(baremuxPath));
    this.app.use("/libcurl/", express.static(libcurlPath));
    this.app.use("/epoxy/", express.static(epoxyPath));
    if (this.options.uv) {
      this.app.use("/uv/", express.static(resolve(__dirname, "config/uv")));
      this.app.use("/uv/", express.static(uvPath));
    }
    if (this.options.scramjet) {
      this.app.use("/scramjet/", express.static(scramjetPath));
    }
    this.server.on("request", (req, res) => {
      if (this.options.rammerhead && shouldRouteRh(req)) {
        routeRhRequest(req, res);
      } else {
        this.app(req, res);
      }
    });
    this.server.on("upgrade", (req, socket, head) => {
      if (req.url && req.url.endsWith("/wisp/")) {
        if (this.options.wispOptions) {
          for (let option in this.options.wispOptions) {
            wisp.options[option] = this.options.wispOptions[option];
          }
        }
        wisp.routeRequest(req, socket, head);
      } else if (this.options.rammerhead && shouldRouteRh(req)) {
        routeRhUpgrade(req, socket, head);
      } else {
        socket.end();
      }
    });
  };
  listen = (port, callback) => {
    this.server.listen(port, callback);
  };
}

const ChemicalVitePlugin = (options) => ({
  name: "chemical-vite-plugin",
  configureServer(server) {
    if (options) {
      if (typeof options !== "object" || Array.isArray(options)) {
        options = {};
        console.error("Error: ChemicalServer options invalid.");
      }
    } else {
      options = {};
    }

    if (options.uv === undefined) {
      options.uv = true;
    }

    if (options.scramjet === undefined) {
      options.scramjet = true;
    }

    if (options.rammerhead === undefined) {
      options.rammerhead = true;
    }

    if (options.demoMode === undefined) {
      options.demoMode = false;
    }

    const rh = createRammerhead();
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
      "/api/shuffleDict",
    ];
    const rammerheadSession = /^\/[a-z0-9]{32}/;
    const shouldRouteRh = (req) => {
      const url = new URL(req.url, "http://0.0.0.0");
      return (
        rammerheadScopes.includes(url.pathname) ||
        rammerheadSession.test(url.pathname)
      );
    };
    const routeRhRequest = (req, res) => {
      rh.emit("request", req, res);
    };
    const routeRhUpgrade = (req, socket, head) => {
      rh.emit("upgrade", req, socket, head);
    };

    const app = express();
    app.get("/chemical.js", async function (req, res) {
      let chemicalMain = await readFileSync(
        resolve(__dirname, "client/chemical.js"),
        "utf8"
      );

      if (options.default) {
        if (["uv", "rammerhead", "scramjet"].includes(options.default)) {
          chemicalMain =
            `const defaultService = "${options.default}";\n\n` + chemicalMain;
        } else {
          chemicalMain = `const defaultService = "uv";\n\n` + chemicalMain;
          console.error("Error: Chemical default option invalid.");
        }
      } else {
        chemicalMain = `const defaultService = "uv";\n\n` + chemicalMain;
      }

      chemicalMain =
        "const uvEnabled = " + String(options.uv) + ";\n" + chemicalMain;
      chemicalMain =
        "const scramjetEnabled = " +
        String(options.scramjet) +
        ";\n" +
        chemicalMain;
      chemicalMain =
        "const rammerheadEnabled = " +
        String(options.rammerhead) +
        ";\n" +
        chemicalMain;
      chemicalMain =
        "const demoMode = " + String(options.demoMode) + ";\n" + chemicalMain;

      chemicalMain = "(async () => {\n" + chemicalMain + "\n})();";

      res.type("application/javascript");
      return res.send(chemicalMain);
    });
    app.get("/chemical.sw.js", async function (req, res) {
      let chemicalSW = await readFileSync(
        resolve(__dirname, "client/chemical.sw.js"),
        "utf8"
      );

      chemicalSW =
        "const uvEnabled = " + String(options.uv) + ";\n" + chemicalSW;
      chemicalSW =
        "const scramjetEnabled = " +
        String(options.scramjet) +
        ";\n" +
        chemicalSW;
      chemicalSW =
        "const rammerheadEnabled = " +
        String(options.rammerhead) +
        ";\n" +
        chemicalSW;

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

    const upgraders = server.httpServer.listeners("upgrade");

    for (const upgrader of upgraders) {
      server.httpServer.off("upgrade", upgrader);
    }

    server.httpServer.on("upgrade", (req, socket, head) => {
      if (req.url && req.url.endsWith("/wisp/")) {
        if (options.wispOptions) {
          for (let option in options.wispOptions) {
            wisp.options[option] = options.wispOptions[option];
          }
        }
        wisp.routeRequest(req, socket, head);
      } else if (options.rammerhead && shouldRouteRh(req)) {
        routeRhUpgrade(req, socket, head);
      } else {
        for (const upgrader of upgraders) {
          upgrader(req, socket, head);
        }
      }
    });
  },
});

class ChemicalBuild {
  constructor(options) {
    if (options) {
      if (typeof options !== "object" || Array.isArray(options)) {
        options = {};
        console.error("Error: ChemicalBuild options invalid.");
      }
    } else {
      options = {};
    }

    if (options.path === undefined) {
      options.path = "dist";
    }

    if (options.path.startsWith("/")) {
      options.path = options.path.substring(1);
    }

    if (options.path.endsWith("/")) {
      options.path = options.path.slice(0, -1);
    }

    if (options.uv === undefined) {
      options.uv = true;
    }

    if (options.scramjet === undefined) {
      options.scramjet = true;
    }

    if (options.rammerhead === undefined) {
      options.rammerhead = true;
    }

    if (options.demoMode === undefined) {
      options.demoMode = false;
    }

    this.options = options;
  }
  async write(deletePath = false) {
    if (!existsSync(resolve(this.options.path))) {
      mkdirSync(resolve(this.options.path), { recursive: true });
    } else {
      if (deletePath) {
        readdirSync(resolve(this.options.path)).forEach((file) =>
          rmSync(resolve(this.options.path, file), { recursive: true })
        );
      }
    }

    let chemicalMain = await readFileSync(
      resolve(__dirname, "client/chemical.js"),
      "utf8"
    );

    if (this.options.default) {
      if (["uv", "rammerhead", "scramjet"].includes(this.options.default)) {
        chemicalMain =
          `const defaultService = "${this.options.default}";\n\n` +
          chemicalMain;
      } else {
        chemicalMain = `const defaultService = "uv";\n\n` + chemicalMain;
        console.error("Error: Chemical default option invalid.");
      }
    } else {
      chemicalMain = `const defaultService = "uv";\n\n` + chemicalMain;
    }

    chemicalMain =
      "const uvEnabled = " + String(this.options.uv) + ";\n" + chemicalMain;
    chemicalMain =
      "const scramjetEnabled = " +
      String(this.options.scramjet) +
      ";\n" +
      chemicalMain;
    chemicalMain =
      "const rammerheadEnabled = " +
      String(this.options.rammerhead) +
      ";\n" +
      chemicalMain;
    chemicalMain =
      "const demoMode = " +
      String(this.options.demoMode) +
      ";\n" +
      chemicalMain;

    chemicalMain = "(async () => {\n" + chemicalMain + "\n})();";

    writeFileSync(resolve(this.options.path, "chemical.js"), chemicalMain);

    let chemicalSW = await readFileSync(
      resolve(__dirname, "client/chemical.sw.js"),
      "utf8"
    );

    chemicalSW =
      "const uvEnabled = " + String(this.options.uv) + ";\n" + chemicalSW;
    chemicalSW =
      "const scramjetEnabled = " +
      String(this.options.scramjet) +
      ";\n" +
      chemicalSW;
    chemicalSW =
      "const rammerheadEnabled = " +
      String(this.options.rammerhead) +
      ";\n" +
      chemicalSW;

    writeFileSync(resolve(this.options.path, "chemical.sw.js"), chemicalSW);

    if (this.options.demoMode) {
      copyFileSync(
        resolve(__dirname, "client/chemical.demo.html"),
        resolve(this.options.path, "chemical.demo.html")
      );
    }

    cpSync(baremuxPath, resolve(this.options.path, "baremux"), {
      recursive: true,
    });
    cpSync(libcurlPath, resolve(this.options.path, "libcurl"), {
      recursive: true,
    });
    cpSync(epoxyPath, resolve(this.options.path, "epoxy"), { recursive: true });
    cpSync(libcurlPath, resolve(this.options.path, "libcurl"), {
      recursive: true,
    });
    if (this.options.uv) {
      cpSync(uvPath, resolve(this.options.path, "uv"), { recursive: true });
      copyFileSync(
        resolve(__dirname, "config/uv/uv.config.js"),
        resolve(this.options.path, "uv/uv.config.js")
      );
    }
  }
}

export { ChemicalServer, ChemicalBuild, ChemicalVitePlugin };
