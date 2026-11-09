"use client";

import { useEffect, useState } from "react";
import { registerTools } from "../lib/webmcp/register.js";

export default function ToolPanel({ tools, presets }) {
  const [mode, setMode] = useState({
    phase: "checking",
    native: false,
    canInvoke: false,
  });
  const [selectedName, setSelectedName] = useState(tools[0].name);
  const [argumentsText, setArgumentsText] = useState(
    JSON.stringify(presets[tools[0].name], null, 2),
  );
  const [result, setResult] = useState("The tool result will appear here.");
  const [busy, setBusy] = useState(false);
  const selected = tools.find((tool) => tool.name === selectedName) || tools[0];
  const { execute, ...contract } = selected;

  useEffect(() => {
    // document exists only in the browser. Server rendering never registers tools.
    const lifetime = new AbortController();
    let registration;
    setMode({ phase: "checking", native: false, canInvoke: false });
    registerTools(document.modelContext, tools, { signal: lifetime.signal })
      .then((value) => {
        registration = value;
        if (lifetime.signal.aborted) value.dispose();
        else
          setMode({
            phase: "ready",
            native: value.native,
            canInvoke: value.canInvoke,
          });
      })
      .catch((error) => {
        if (!lifetime.signal.aborted) {
          setMode({
            phase: "ready",
            native: false,
            canInvoke: false,
            error: error.message,
          });
        }
      });
    // Navigating between Next.js routes unmounts the panel. Cleanup also handles
    // React Strict Mode's development mount/cleanup cycle without leaking tools.
    return () => {
      lifetime.abort();
      registration?.dispose();
    };
  }, [tools]);

  async function invoke() {
    setBusy(true);
    try {
      const args = JSON.parse(argumentsText);
      let output;
      if (mode.canInvoke) {
        const registered = (await document.modelContext.getTools()).find(
          (tool) => tool.name === selected.name,
        );
        if (!registered)
          throw new Error("Tool is no longer registered. Reload this example.");
        output = await document.modelContext.executeTool(registered, args);
      } else {
        // This is an honest fallback, not a polyfill or browser-mediated WebMCP.
        output = await selected.execute(args);
      }
      setResult(
        typeof output === "string" ? output : JSON.stringify(output, null, 2),
      );
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  const status =
    mode.phase === "checking"
      ? "Checking browser support…"
      : mode.native
        ? `Native WebMCP tools registered · ${tools.length}`
        : "Rehearsal mode · native WebMCP is unavailable in this browser";

  return (
    <section className="tool-panel" aria-labelledby="tool-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">THE TOOL PATH</p>
          <h2 id="tool-title">Try the same actions with a tool</h2>
        </div>
        <p id="status" role="status" data-native={String(mode.native)}>
          {status}
        </p>
      </div>
      <p id="mode-copy">
        {mode.canInvoke
          ? "This panel discovers and invokes real browser tools. It is a deterministic caller, not an AI agent."
          : "Rehearsal calls the same JavaScript handlers directly. It does not test native WebMCP. The shop and help desk still work."}
      </p>
      <p className="fine">
        <a href="https://developer.chrome.com/docs/ai/webmcp">
          Native browser setup and compatibility ↗
        </a>
      </p>
      {mode.native && !mode.canInvoke && (
        <p>
          Tools are registered for compatible clients; this browser does not
          expose the panel’s discovery and execution APIs.
        </p>
      )}
      {mode.error && (
        <p role="alert">
          Registration failed: {mode.error}. The rehearsal handler is available.
        </p>
      )}
      <div className="tool-grid">
        <div>
          <label htmlFor="tool-select">Tool</label>
          <select
            id="tool-select"
            value={selectedName}
            onChange={(event) => {
              setSelectedName(event.target.value);
              setArgumentsText(
                JSON.stringify(presets[event.target.value], null, 2),
              );
            }}
          >
            {tools.map((tool) => (
              <option key={tool.name} value={tool.name}>
                {tool.name}
              </option>
            ))}
          </select>
          <label htmlFor="arguments">Arguments (JSON)</label>
          <textarea
            id="arguments"
            rows={6}
            spellCheck={false}
            value={argumentsText}
            onChange={(event) => setArgumentsText(event.target.value)}
          />
          <button
            id="run"
            disabled={busy || mode.phase === "checking"}
            onClick={invoke}
          >
            {busy
              ? "Running…"
              : mode.canInvoke
                ? "Call native WebMCP tool"
                : "Run rehearsal handler"}
          </button>
        </div>
        <div>
          <label htmlFor="result">Result</label>
          <pre id="result" aria-live="polite">
            {result}
          </pre>
          <details>
            <summary>Inspect the tool contract</summary>
            <pre>{JSON.stringify(contract, null, 2)}</pre>
          </details>
        </div>
      </div>
    </section>
  );
}
