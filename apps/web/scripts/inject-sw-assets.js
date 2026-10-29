import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function listAssets(directory, root = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.name.startsWith(".")) return [];
    if (entry.isDirectory()) return listAssets(filename, root);
    const relative = path.relative(root, filename).replaceAll(path.sep, "/");
    if (relative === "sw.js" || relative.endsWith(".map") || relative === "vercel.json") return [];
    return [relative];
  }).sort();
}

export function injectServiceWorkerAssets(distDirectory) {
  const workerPath = path.join(distDirectory, "sw.js");
  let source = fs.readFileSync(workerPath, "utf8");
  const cacheDeclaration = /const\s+CACHE_NAME\s*=\s*["'][^"']+["'];/;
  const assetsDeclaration = /const\s+STATIC_FILES\s*=\s*\[[\s\S]*?\];/;
  if (!cacheDeclaration.test(source) || !assetsDeclaration.test(source)) {
    throw new Error("Service worker must declare CACHE_NAME and STATIC_FILES; refusing an incomplete offline build.");
  }

  const files = listAssets(distDirectory);
  const hash = createHash("sha256");
  hash.update(source);
  for (const file of files) {
    hash.update(file);
    hash.update(fs.readFileSync(path.join(distDirectory, file)));
  }
  const cacheName = `rupeebill-static-${hash.digest("hex").slice(0, 16)}`;
  const assets = [...new Set(["/", "/index.html", ...files.map((file) => `/${file}`)])];
  source = source.replace(cacheDeclaration, `const CACHE_NAME = "${cacheName}";`);
  source = source.replace(assetsDeclaration, () => `const STATIC_FILES = ${JSON.stringify(assets, null, 2)};`);
  fs.writeFileSync(workerPath, source, "utf8");
  return { cacheName, assets };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const distDirectory = fileURLToPath(new URL("../dist/", import.meta.url));
  try {
    const { cacheName, assets } = injectServiceWorkerAssets(distDirectory);
    console.log(`[PWA Build] Cached ${assets.length} assets in ${cacheName}.`);
  } catch (error) {
    console.error("[PWA Build] Failed to prepare offline assets:", error);
    process.exitCode = 1;
  }
}
