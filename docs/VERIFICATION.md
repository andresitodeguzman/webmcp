# Verification record

Verified on 9 November 2026 on Andre's MacBook Neo, using Node.js 24.15.0 and Microsoft Edge 157.0.4341.42.

## Story and boundaries

A person submits a synthetic community-support ticket through the form or the tool panel. Both paths call `submit(input)`, which validates through `store.submit(input)`, updates the visible ticket list and returns the same result. The server only serves local assets. No API, database, account or model provider is involved.

## Passed

- `npm run check`: application/server syntax checks and **9 tests passed, 0 failures**.
- Unit tests: valid submissions, duplicate calls, reset, invalid arguments, immutable snapshots, structured results, cancellation before mutation, missing native API, registration cleanup and registration failure.
- HTTP tests: all five app assets are served, content security headers are present, unknown paths and non-GET/HEAD methods are rejected, and package/server/environment files are not served.
- `CHROME_BIN="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" npm run test:browser`: **both fallback and native WebMCP passed**.
- Each browser mode checked preview without mutation, human submission, tool submission, deduplication across the two paths, malformed JSON, application validation, HTML escaping, reset, reload, no uncaught JavaScript exceptions and no horizontal overflow at 390px width.
- Native mode additionally discovered exactly one `submit_demo_ticket` using the real `document.modelContext.getTools()` API; the panel invoked it using `executeTool(tool, args)` and updated the shared visible state.
- Captured desktop (1280 × 1050 viewport, full page) and mobile (390 × 844 viewport, full page) screenshots. Reviewed the [native desktop screenshot](images/native-desktop.png) and [native mobile screenshot](images/native-mobile.png).
- Opened the localhost preview in the normal Edge profile and visually inspected its layout. That profile correctly displays rehearsal mode because native WebMCP is not enabled there.

The browser test launches temporary profiles with the `WebMCP` Blink feature explicitly disabled/enabled. It removes those profiles afterward. No browser security protections are disabled and no normal browser settings are changed. Localhost tests required permission to bind loopback ports outside the execution sandbox.

## Test harness repair

The prepared browser test initially passed the fallback run, then reached its final native-discovery assertion and failed with `SyntaxError: Unexpected identifier 'document'`. Its CDP evaluation used a top-level `await` expression without enabling REPL parsing. Wrapping that assertion in an async function fixed the harness. Both full browser runs subsequently passed.

## Still to rehearse

- A real LLM agent's discovery, choice of tool and handling of missing arguments. The panel and tests use deterministic callers, not an LLM.
- The exact browser/client combination used on stage. Experimental WebMCP implementations can change.
- Other browsers, operating systems and assistive technologies have not been tested here. The browser smoke test checks narrow layout, not a complete accessibility audit.

## Presentation laptop checklist

1. Run `npm run check` and `npm start`.
2. Open localhost:4173. Verify “Silip muna” leaves the ticket count at zero.
3. Submit the form; verify one ticket appears. Reset.
4. In a development profile with WebMCP support, verify the native status label and native call button.
5. Invoke the tool; verify the visible ticket and JSON result. Repeat and verify no extra ticket.
6. Try malformed JSON and invalid categories; verify no mutation and an understandable error.
7. Reset, reload and repeat. Check keyboard focus and narrow-screen layout.
8. If using a real agent, confirm discovery and invocation in that exact browser/client setup before the talk.
9. If native support is unavailable, explicitly present rehearsal mode as a direct function-call demonstration.

## Repository

The target is the owner-created public repository [andresitodeguzman/webmcp](https://github.com/andresitodeguzman/webmcp). The existing initial commit and `# webmcp` README heading were retained; the prepared example was added to that history. Test results above describe the local checkout independently of GitHub publication.
