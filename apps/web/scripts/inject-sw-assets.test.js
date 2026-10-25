import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { injectServiceWorkerAssets } from "./inject-sw-assets.js";

const worker = fs.readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "rupeebill-pwa-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, "assets"));
  fs.writeFileSync(path.join(directory, "sw.js"), worker);
  fs.writeFileSync(path.join(directory, "index.html"), "<html>billing</html>");
  fs.writeFileSync(path.join(directory, "assets", "app-123.js"), "export const app = true;");
  fs.writeFileSync(path.join(directory, "assets", "app-123.js.map"), "{}");
  return directory;
}

test("the installed worker precaches the built application bundle", async (t) => {
  const directory = fixture(t);
  const { assets, cacheName } = injectServiceWorkerAssets(directory);
  const events = new Map();
  let cachedAssets;
  const context = {
    self: { addEventListener: (name, callback) => events.set(name, callback), skipWaiting() {} },
    caches: { open: async (name) => {
      assert.equal(name, cacheName);
      return { addAll: async (urls) => { cachedAssets = urls; } };
    } },
    BroadcastChannel: class {},
  };
  vm.runInNewContext(fs.readFileSync(path.join(directory, "sw.js"), "utf8"), context);
  let installed;
  events.get("install")({ waitUntil: (promise) => { installed = promise; } });
  await installed;
  assert.deepEqual(Array.from(cachedAssets), assets);
  assert.ok(assets.includes("/assets/app-123.js"));
  assert.ok(!assets.some((asset) => asset.endsWith(".map") || asset === "/sw.js"));
});

test("changing a bundled asset produces a new cache version", (t) => {
  const directory = fixture(t);
  const first = injectServiceWorkerAssets(directory);
  fs.writeFileSync(path.join(directory, "sw.js"), worker);
  assert.equal(injectServiceWorkerAssets(directory).cacheName, first.cacheName);
  fs.writeFileSync(path.join(directory, "assets", "app-123.js"), "export const app = false;");
  fs.writeFileSync(path.join(directory, "sw.js"), worker);
  assert.notEqual(injectServiceWorkerAssets(directory).cacheName, first.cacheName);
});

test("a mismatched service worker fails the build", (t) => {
  const directory = fixture(t);
  fs.writeFileSync(path.join(directory, "sw.js"), worker.replaceAll("STATIC_FILES", "OTHER_FILES"));
  assert.throws(() => injectServiceWorkerAssets(directory), /incomplete offline build/);
});
