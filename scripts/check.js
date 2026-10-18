import { readFile } from "node:fs/promises";

const transpiler = new Bun.Transpiler({ loader: "js", target: "browser" });
const browserFiles = ["js/site.js", "js/image-optimizer.js", "js/stock-enhancements.js", "js/inventory.js", "public/home-copy.js"];
const buildFiles = ["scripts/build.js"];

for (const file of [...browserFiles, ...buildFiles]) {
  const source = await readFile(file, "utf8");
  transpiler.transformSync(source);
  console.log(`JavaScript válido: ${file}`);
}

const browserGlobal = /\b(?:window|document|localStorage|sessionStorage|navigator)\b/;
for (const file of buildFiles) {
  const source = await readFile(file, "utf8");
  if (browserGlobal.test(source)) throw new Error(`API de navegador encontrada no backend: ${file}`);
}

console.log("Frontend Supabase validado sem dependência do backend local.");
