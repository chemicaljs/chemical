import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { nanoid } from "nanoid";
import {
  cpSync,
  copyFileSync,
  rmSync,
  existsSync,
  renameSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));

const uvRandomPath = nanoid(10);
const uvFolder = `ultraviolet/dist`;

if (existsSync(uvFolder)) {
  rmSync(uvFolder, { recursive: true });
}
cpSync(uvPath, resolve(uvFolder), { recursive: true });
copyFileSync(
  resolve(__dirname, "config/uv/uv.config.js"),
  resolve(uvFolder, "uv.config.js")
);
rmSync(resolve(uvFolder, "sw.js"));
const files = globSync(uvFolder + "/*");
const namedFiles = files.map((file) => "uv/" + file.split("/dist/")[1]);
files.forEach((file) => {
  if (file.endsWith(".map")) {
    return rmSync(file);
  }

  let data = readFileSync(file, "utf8");
  namedFiles.forEach((namedFile) => {
    data = data.replace(
      new RegExp(namedFile, "g"),
      namedFile.replace(new RegExp("uv", "g"), uvRandomPath)
    );
    data = data.split("\n//# sourceMappingURL=")[0];
  });
  writeFileSync(file, data, "utf8");
  const newName = file.replace(new RegExp("uv", "g"), uvRandomPath);
  renameSync(file, newName);
});
const pathData = `const uvRandomPath = "${uvRandomPath}";

export { uvRandomPath };`;
writeFileSync("ultraviolet/path.js", pathData, "utf8");
