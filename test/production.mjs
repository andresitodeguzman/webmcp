// Smoke-test the built Next.js server, rather than treating dev mode as production.
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const port = 4185;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "-H",
    "127.0.0.1",
    "-p",
    String(port),
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let log = "";
server.stdout.on("data", (bytes) => {
  log += bytes;
});
server.stderr.on("data", (bytes) => {
  log += bytes;
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(log);
    try {
      ready = (await fetch(`http://127.0.0.1:${port}`)).ok;
    } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, log);
  for (const route of ["/", "/shop", "/help-desk"]) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("permissions-policy"), "tools=(self)");
    const html = await response.text();
    assert.match(html, /id="main"/);
    const assets = [...html.matchAll(/src="([^\"]+\.js[^\"]*)"/g)].map(
      (match) => match[1].replaceAll("&amp;", "&"),
    );
    assert.ok(assets.length > 0, "JavaScript bundles should be present");
    for (const asset of assets)
      assert.equal(
        (await fetch(`http://127.0.0.1:${port}${asset}`)).status,
        200,
      );
  }
  for (const route of [
    "/package.json",
    "/.env",
    "/src/domain.js",
    "/no-such-file",
  ]) {
    assert.equal(
      (await fetch(`http://127.0.0.1:${port}${route}`)).status,
      404,
      route,
    );
  }
  console.log(
    "PASS production HTTP: three routes, JavaScript assets, response headers, and private-file 404s.",
  );
} finally {
  server.kill();
}
