import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const scramjetPath = resolve(__dirname, "dist");

export { scramjetPath };
