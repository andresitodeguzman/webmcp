import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import manifest from "../app/manifest.js";

const workerSource = await readFile(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);
function worker({ offline = false } = {}) {
  const events = {};
  const writes = [],
    deleted = [];
  let claimed = false,
    skipped = false;
  const context = {
    self: {
      location: { origin: "https://demo.example" },
      clients: {
        async claim() {
          claimed = true;
        },
      },
      skipWaiting() {
        skipped = true;
      },
      addEventListener(name, callback) {
        events[name] = callback;
      },
    },
    URL,
    Response,
    caches: {
      async open() {
        return {
          async addAll(urls) {
            writes.push(...urls);
          },
        };
      },
      async keys() {
        return ["webmcp-offline-v1", "webmcp-offline-old", "another-app"];
      },
      async delete(name) {
        deleted.push(name);
      },
      async match(url) {
        return new Response(
          url === "/offline.html" ? "Offline explanation" : "Icon",
        );
      },
    },
    async fetch() {
      if (offline) throw new Error("Offline");
      return new Response("Fresh network page");
    },
  };
  vm.runInNewContext(workerSource, context);
  return {
    events,
    writes,
    deleted,
    get claimed() {
      return claimed;
    },
    get skipped() {
      return skipped;
    },
  };
}
async function lifecycle(callback) {
  let pending;
  callback({
    waitUntil(value) {
      pending = value;
    },
  });
  await pending;
}
async function request(
  instance,
  { method = "GET", mode = "navigate", path = "/shop" } = {},
) {
  let response;
  instance.events.fetch({
    request: { method, mode, url: `https://demo.example${path}` },
    respondWith(value) {
      response = value;
    },
  });
  return response ? (await response).text() : undefined;
}

test("PWA: manifest has stable identity, scope, standalone mode and real-sized icons", async () => {
  const data = manifest();
  assert.equal(data.id, "/");
  assert.equal(data.scope, "/");
  assert.equal(data.start_url, "/");
  assert.equal(data.display, "standalone");
  for (const icon of data.icons) {
    const bytes = await readFile(
      new URL(`../public${icon.src}`, import.meta.url),
    );
    const [width, height] = icon.sizes.split("x").map(Number);
    assert.equal(bytes.readUInt32BE(16), width);
    assert.equal(bytes.readUInt32BE(20), height);
  }
  assert.ok(data.icons.some((icon) => icon.purpose === "maskable"));
});
test("PWA: installs only offline explanation and icons, without forcing an update", async () => {
  const instance = worker();
  await lifecycle(instance.events.install);
  assert.equal(instance.writes.length, 5);
  assert.equal(
    instance.writes.every(
      (url) => url === "/offline.html" || url.startsWith("/icons/"),
    ),
    true,
  );
  assert.equal(instance.skipped, false);
});
test("PWA: activation removes only obsolete lab caches and claims clients", async () => {
  const instance = worker();
  await lifecycle(instance.events.activate);
  assert.deepEqual(instance.deleted, ["webmcp-offline-old"]);
  assert.equal(instance.claimed, true);
  instance.events.message({ data: { type: "unrelated" } });
  assert.equal(instance.skipped, false);
  instance.events.message({ data: { type: "SKIP_WAITING" } });
  assert.equal(instance.skipped, true);
});
test("PWA: online navigation is fresh; offline navigation gets a static explanation", async () => {
  assert.equal(await request(worker()), "Fresh network page");
  assert.equal(await request(worker({ offline: true })), "Offline explanation");
  assert.equal(
    await request(worker({ offline: true }), {
      mode: "no-cors",
      path: "/icons/icon-192.png",
    }),
    "Icon",
  );
});
test("PWA: never intercepts mutations, RSC fetches or arbitrary assets", async () => {
  for (const options of [
    { method: "POST" },
    { mode: "cors", path: "/shop?_rsc=1" },
    { mode: "no-cors", path: "/private.json" },
  ]) {
    assert.equal(await request(worker({ offline: true }), options), undefined);
  }
});
