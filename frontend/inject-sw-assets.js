import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, "dist");
const SW_FILE = path.join(DIST_DIR, "sw.js");

function getFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

try {
  if (!fs.existsSync(SW_FILE)) {
    console.error(`[PWA Build] Service worker file not found at ${SW_FILE}`);
    process.exit(1);
  }

  // Get all files in dist
  const allFiles = getFilesRecursively(DIST_DIR);

  // Convert absolute paths to root-relative URLs
  const assets = allFiles
    .map(file => {
      const relativePath = path.relative(DIST_DIR, file).replace(/\\/g, "/");
      return "/" + relativePath;
    })
    // Filter out sw.js itself, map files, and other config/unnecessary files
    .filter(url => {
      return (
        url !== "/sw.js" &&
        !url.endsWith(".map") &&
        !url.startsWith("/.vite/") && // Exclude any vite metadata
        url !== "/vercel.json" &&     // Exclude vercel config
        url !== "/.vercelignore"
      );
    });

  // Ensure unique list and force root paths to be cached first
  const uniqueAssets = Array.from(new Set([
    "/",
    "/index.html",
    ...assets
  ]));

  console.log(`[PWA Build] Found ${uniqueAssets.length} assets to cache.`);

  // Read the built sw.js file
  let swContent = fs.readFileSync(SW_FILE, "utf8");

  // Generate unique cache name based on current timestamp
  const buildId = Date.now();
  const cacheName = `finflow-static-v${buildId}`;

  // Replace CACHE_NAME declaration
  swContent = swContent.replace(
    /const\s+CACHE_NAME\s*=\s*["'][^"']+["'];/,
    `const CACHE_NAME = "${cacheName}";`
  );

  // Replace STATIC_ASSETS array
  const assetsArrayString = JSON.stringify(uniqueAssets, null, 2);
  swContent = swContent.replace(
    /const\s+STATIC_ASSETS\s*=\s*\[[\s\S]*?\];/,
    `const STATIC_ASSETS = ${assetsArrayString};`
  );

  fs.writeFileSync(SW_FILE, swContent, "utf8");
  console.log(`[PWA Build] Injected assets and cache name ("${cacheName}") into sw.js successfully.`);
} catch (error) {
  console.error("[PWA Build] Error injecting assets:", error);
  process.exit(1);
}
