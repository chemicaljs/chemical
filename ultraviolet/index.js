import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const uvPath = resolve(__dirname, "../ultraviolet/dist/");

export { uvPath };
