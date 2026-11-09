// No browser-test package is needed: Node's WebSocket talks to a disposable
// Chromium profile. Native mode must pass the real API, never the fallback.
import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const port = Number(process.env.TEST_PORT || 4184);
const base = `http://127.0.0.1:${port}`;
const artifactDirectory = process.env.TEST_SERVER === "dev" ? "artifacts/dev" : "artifacts";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(fn) {
  let lastError;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`Timed out${lastError ? `: ${lastError.message}` : ""}`);
}
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    process.env.TEST_SERVER === "dev" ? "dev" : "start",
    "-H",
    "127.0.0.1",
    "-p",
    String(port),
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let serverLog = "";
server.stdout.on("data", (bytes) => {
  serverLog += bytes;
});
server.stderr.on("data", (bytes) => {
  serverLog += bytes;
});

async function run(native) {
  const profile = await mkdtemp(path.join(tmpdir(), "webmcp-next-"));
  const browser = spawn(process.env.CHROME_BIN || "chromium", [
    "--headless=new",
    "--disable-dev-shm-usage",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    native
      ? "--enable-blink-features=WebMCP"
      : "--disable-blink-features=WebMCP",
    "about:blank",
  ]);
  let stderr = "";
  let launchError;
  browser.stderr.on("data", (bytes) => {
    stderr += bytes;
  });
  browser.on("error", (error) => {
    launchError = error;
  });
  let socket;
  try {
    const wsurl = await waitFor(() => {
      if (launchError) throw launchError;
      return stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
    });
    const pages = await (
      await fetch(`http://${new URL(wsurl).host}/json`)
    ).json();
    socket = new WebSocket(
      pages.find((page) => page.type === "page").webSocketDebuggerUrl,
    );
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    let id = 0;
    const calls = new Map();
    const errors = [];
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const call = calls.get(message.id);
        if (!call) return;
        calls.delete(message.id);
        clearTimeout(call.timer);
        message.error
          ? call.reject(new Error(JSON.stringify(message.error)))
          : call.resolve(message.result);
      }
      if (message.method === "Runtime.exceptionThrown")
        errors.push(message.params.exceptionDetails);
      if (
        message.method === "Runtime.consoleAPICalled" &&
        message.params.type === "error"
      )
        errors.push(message.params.args);
    });
    const cdp = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const key = ++id;
        const timer = setTimeout(() => {
          calls.delete(key);
          reject(new Error(`CDP timeout: ${method}`));
        }, 10000);
        calls.set(key, { resolve, reject, timer });
        socket.send(JSON.stringify({ id: key, method, params }));
      });
    const evaluate = async (expression) => {
      const result = await cdp("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails)
        throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const text = (selector) =>
      evaluate(
        `document.querySelector(${JSON.stringify(selector)})?.textContent`,
      );
    const click = (selector) =>
      evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const fill = (selector, value) =>
      evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)});
      element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', {bubbles:true}));
    })()`);
    const ready = () =>
      waitFor(() =>
        evaluate("document.getElementById('run')?.disabled === false"),
      );
    async function tool(name, args) {
      await fill("#tool-select", name);
      await fill(
        "#arguments",
        typeof args === "string" ? args : JSON.stringify(args),
      );
      await click("#run");
      await ready();
      const result = await text("#result");
      return result.startsWith("Error:")
        ? { error: result }
        : JSON.parse(result);
    }
    async function screenshot(name, width = 1280, height = 1000) {
      await cdp("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 500,
      });
      assert.equal(
        await evaluate(
          "document.documentElement.scrollWidth <= window.innerWidth",
        ),
        true,
      );
      await writeFile(
        `${artifactDirectory}/${native ? "native" : "fallback"}-${name}.png`,
        Buffer.from(
          (
            await cdp("Page.captureScreenshot", {
              format: "png",
              captureBeyondViewport: true,
            })
          ).data,
          "base64",
        ),
      );
    }
    await cdp("Runtime.enable");
    await cdp("Page.enable");
    await cdp("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp("Page.navigate", { url: `${base}/help-desk` });
    await ready();
    assert.equal(
      await evaluate("document.getElementById('status').dataset.native"),
      String(native),
    );
    await click("#preview");
    assert.equal(await text("#count"), "0");
    await evaluate("document.getElementById('ticket-form').requestSubmit()");
    await waitFor(async () => (await text("#count")) === "1");
    assert.equal(
      (
        await tool("submit_demo_ticket", {
          summary: "Hindi ako maka-sign in sa demo account ko",
          category: "account",
        })
      ).duplicate,
      true,
    );
    assert.equal(
      (await tool("submit_demo_ticket", { summary: "bad", category: "other" }))
        .ok,
      false,
    );
    await tool("submit_demo_ticket", {
      summary: "<img src=x onerror=alert(1)>",
      category: "other",
    });
    assert.equal(
      await evaluate("document.querySelectorAll('#tickets img').length"),
      0,
    );
    await click("#reset");
    assert.equal(await text("#count"), "0");
    await tool("submit_demo_ticket", {
      summary: "Hindi ako maka-sign in sa demo account ko",
      category: "account",
    });
    await screenshot("help-desktop");
    await screenshot("help-mobile", 390, 844);

    // Use Next.js client navigation to verify effect cleanup, not just page reloads.
    await click("a.wordmark");
    await waitFor(() =>
      evaluate("location.pathname === '/' && !document.getElementById('run')"),
    );
    if (native)
      await waitFor(() =>
        evaluate(
          "(async () => (await document.modelContext.getTools()).length === 0)()",
        ),
      );
    await click('a[href="/shop"]');
    await ready();
    assert.equal(
      await evaluate("document.getElementById('status').dataset.native"),
      String(native),
    );
    if (native)
      assert.equal(
        await evaluate(
          "(async () => (await document.modelContext.getTools()).length)()",
        ),
        5,
      );
    assert.equal(
      await evaluate("document.getElementById('add-chips').disabled"),
      true,
    );
    assert.equal(
      await evaluate("document.getElementById('review').disabled"),
      true,
    );
    assert.deepEqual(
      (
        await tool("search_products", { query: "coffee", maxPricePhp: 200 })
      ).products.map((p) => p.id),
      ["coffee"],
    );
    assert.equal(
      (await tool("set_cart_item", { productId: "coffee", quantity: 1 })).ok,
      true,
    );
    await click("#add-rice");
    await click("#add-tablea");
    assert.equal(await text("#cart-count"), "3");
    assert.equal(
      (await tool("set_delivery", { method: "delivery" })).cart.totalCentavos,
      48900,
    );
    assert.equal(
      (await tool("set_cart_item", { productId: "coffee", quantity: 1 })).cart
        .itemCount,
      3,
    );
    assert.equal(
      (await tool("set_cart_item", { productId: "chips", quantity: 1 })).ok,
      false,
    );
    assert.equal(
      (await tool("set_cart_item", { productId: "coffee", quantity: 6 })).ok,
      false,
    );
    assert.equal((await tool("get_cart", {})).cart.totalCentavos, 48900);
    assert.ok((await tool("get_cart", "not JSON")).error);
    await fill("#search", "coffee");
    await evaluate("document.querySelector('form.filters').requestSubmit()");
    await waitFor(async () =>
      (await text("#search-count")).startsWith("1 product"),
    );
    await fill("#search", "<img src=x onerror=alert(1)>");
    await evaluate("document.querySelector('form.filters').requestSubmit()");
    await waitFor(async () =>
      (await text("#search-count")).startsWith("0 products"),
    );
    assert.equal(
      await evaluate("document.querySelectorAll('.catalog img').length"),
      0,
    );
    await fill("#search", "");
    await evaluate("document.querySelector('form.filters').requestSubmit()");
    await waitFor(async () =>
      (await text("#search-count")).startsWith("6 products"),
    );
    await tool("get_cart", {});
    await screenshot("shop-desktop");
    await screenshot("shop-mobile", 390, 844);
    await screenshot("shop-desktop", 1280, 1000);
    await tool("prepare_checkout", {});
    await waitFor(() =>
      evaluate("document.getElementById('checkout-dialog').open"),
    );
    assert.equal(await evaluate("document.activeElement.id"), "review-title");
    assert.equal(
      await evaluate("Boolean(document.getElementById('receipt'))"),
      false,
    );
    assert.match(await text("#review-total"), /489/);
    await click("#cancel-review");
    await waitFor(() =>
      evaluate("!document.getElementById('checkout-dialog').open"),
    );
    assert.equal(await text("#cart-count"), "3");
    await tool("prepare_checkout", {});
    // An external tool caller can change state while a review is open.
    await tool("set_delivery", { method: "pickup" });
    await waitFor(() =>
      evaluate("!document.getElementById('checkout-dialog').open"),
    );
    await tool("set_delivery", { method: "delivery" });
    await tool("prepare_checkout", {});
    await waitFor(() =>
      evaluate("document.getElementById('checkout-dialog').open"),
    );
    await screenshot("shop-review");
    await click("#confirm-order");
    await waitFor(() =>
      evaluate("Boolean(document.getElementById('receipt'))"),
    );
    assert.match(await text("#receipt"), /MOCK-001/);
    assert.match(await text("#receipt"), /489/);
    assert.equal(await text("#cart-count"), "0");
    assert.equal(
      (await tool("search_products", { query: "coffee" })).products[0].stock,
      4,
    );
    await click("#reset-shop");
    assert.equal(
      (await tool("search_products", { query: "coffee" })).products[0].stock,
      5,
    );
    assert.equal(
      await evaluate("Boolean(document.getElementById('receipt'))"),
      false,
    );
    await tool("set_cart_item", { productId: "rice", quantity: 1 });
    await cdp("Page.reload");
    await ready();
    assert.equal(await text("#cart-count"), "0");
    if (native)
      assert.equal(
        await evaluate(
          "(async () => (await document.modelContext.getTools()).length)()",
        ),
        5,
      );
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${native ? "native WebMCP" : "fallback"}: help desk; Next.js navigation/cleanup; search; cart/stock/totals; tool/UI shared state; review/cancel/invalidation/confirmation; reset/reload; desktop/mobile; no console errors.`,
    );
  } catch (error) {
    console.error(stderr);
    throw error;
  } finally {
    socket?.close();
    browser.kill();
    if (
      !launchError &&
      browser.exitCode === null &&
      browser.signalCode === null
    )
      await new Promise((resolve) => browser.once("exit", resolve));
    await rm(profile, { recursive: true, force: true });
  }
}
try {
  await waitFor(async () => {
    if (server.exitCode !== null) throw new Error(serverLog);
    return (await fetch(base)).ok;
  });
  await mkdir(artifactDirectory, { recursive: true });
  await run(false);
  await run(true);
} finally {
  server.kill();
}
