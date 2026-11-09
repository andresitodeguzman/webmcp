import test from "node:test";
import assert from "node:assert/strict";
import { createTicketStore } from "../src/domain.js";
import { makeTicketTool } from "../src/tools.js";
import { registerTools } from "../lib/webmcp/register.js";

const valid = { summary: "Cannot sign in", category: "account" };
test("help desk: valid submission, stable duplicate, and reset", () => {
  const store = createTicketStore();
  assert.equal(store.submit(valid).ticket.id, "DEMO-001");
  assert.equal(store.submit(valid).duplicate, true);
  assert.equal(store.list().length, 1);
  store.reset();
  assert.equal(store.list().length, 0);
});
test("help desk: validates input independently of JSON Schema", () => {
  for (const input of [
    null,
    [],
    {},
    { ...valid, category: "wrong" },
    { ...valid, summary: "bad" },
    { ...valid, summary: " ".repeat(7) },
    { ...valid, summary: "x".repeat(121) },
    { ...valid, extra: true },
  ]) {
    assert.throws(() => createTicketStore().submit(input));
  }
});
test("help desk: snapshots cannot change internal state", () => {
  const store = createTicketStore();
  const result = store.submit(valid);
  result.ticket.summary = "changed";
  store.list()[0].summary = "changed";
  assert.equal(store.list()[0].summary, valid.summary);
});
test("help desk: tool returns success and useful errors", async () => {
  const store = createTicketStore();
  const tool = makeTicketTool((input) => store.submit(input));
  assert.equal(JSON.parse(await tool.execute(valid)).ok, true);
  assert.equal(JSON.parse(await tool.execute({})).ok, false);
});
test("help desk: cancelled execution makes no mutation", async () => {
  const store = createTicketStore();
  await assert.rejects(
    makeTicketTool((input) => store.submit(input)).execute(valid, {
      signal: AbortSignal.abort(),
    }),
    { name: "AbortError" },
  );
  assert.equal(store.list().length, 0);
});
test("registration: missing browser API is an honest fallback", async () => {
  assert.equal((await registerTools(undefined, [])).native, false);
});
test("registration: disposal unregisters the whole tool set", async () => {
  const signals = [];
  const result = await registerTools(
    {
      async registerTool(tool, options) {
        signals.push(options.signal);
      },
    },
    [{ name: "a" }, { name: "b" }],
  );
  assert.equal(result.native, true);
  assert.equal(
    signals.every((signal) => !signal.aborted),
    true,
  );
  result.dispose();
  assert.equal(
    signals.every((signal) => signal.aborted),
    true,
  );
});
test("registration: failure rolls back partially registered tools", async () => {
  let signal;
  await assert.rejects(
    registerTools(
      {
        registerTool(tool, options) {
          signal = options.signal;
          if (tool.name === "b") throw new Error("Denied");
        },
      },
      [{ name: "a" }, { name: "b" }],
    ),
    /Denied/,
  );
  assert.equal(signal.aborted, true);
});
test("registration: unmount during async registration cancels it before another tool registers", async () => {
  const lifetime = new AbortController();
  let release;
  let calls = 0;
  let signal;
  const pending = registerTools(
    {
      registerTool(tool, options) {
        calls++;
        signal = options.signal;
        return new Promise((resolve) => {
          release = resolve;
        });
      },
    },
    [{ name: "a" }, { name: "b" }],
    { signal: lifetime.signal },
  );
  lifetime.abort();
  release();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(calls, 1);
  assert.equal(signal.aborted, true);
});
