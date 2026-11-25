import { Chemical } from "../index.js";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;

const server = new Chemical({
  port,
  staticDir: "build",
  spaMode: true,
});

await server.start();
console.log(`Chemical dev environment running at http://localhost:${port}`);
