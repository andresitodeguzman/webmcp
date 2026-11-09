# Verification record

Verified on **9 November 2026** on macOS, with **Node.js 24.15.0**, **Next.js 16.4.5**, **React 19.3.1**, and **Microsoft Edge 157.0.4341.42**.

## What the app does

The home page links to two independent examples. In the help desk, the form and tool share one validated ticket action. In Pantry Run, ordinary shopping controls and five tools share a mock catalog, basket, delivery choice, and checkout-review state. A separate page button confirms a local receipt. There are no ticket, order, payment, database, or model-provider APIs.

## Checks that passed

| Check | Result |
| --- | --- |
| `npm run check` | Syntax checks and **22 logic tests passed, 0 failures**. |
| `npm run build` | Successful production build; `/`, `/shop`, and `/help-desk` prerendered. |
| `npm run test:production` | All three production pages and their JavaScript bundles return 200; response headers present; source/config/environment paths return 404. |
| `npm run test:browser` with Edge | **Fallback and native WebMCP both passed** against the production build. |
| `TEST_SERVER=dev npm run test:browser` with Edge | **Fallback and native WebMCP both passed** in Next.js development mode with React Strict Mode enabled. |
| `npm audit --omit=dev` | **0 reported vulnerabilities** in the installed dependency tree at the time checked. This is an advisory lookup, not a complete security audit. |

Set `CHROME_BIN` as shown in the [README](../README.md#check-it-and-share-it) for the browser commands. Browser tests use temporary Chromium-compatible profiles with the `WebMCP` Blink feature explicitly disabled or enabled. They do not change the normal Edge profile, install an extension, or disable browser security checks. All test servers bind loopback addresses.

## What the tests cover

**Help desk:** preview without mutation, form submission, matching tool call, duplicate handling, validation errors, cancellation before mutation, immutable snapshots, and rendering input as text rather than executable HTML.

**Shopping:** combined catalog filters; price/stock validation; rejection of unknown or extra fields; integer centavo totals; absolute-quantity retries; zero quantity removing an item; empty-basket rejection; read-only tools leaving state unchanged; checkout review without ordering; cancellation preserving the basket; basket or delivery changes invalidating an old review; stable duplicate confirmation; immutable mock receipts; stock decrement after confirmation; and reset restoring stock without reusing old review IDs.

**Browser flow:** a mixture of UI clicks and native/fallback calls builds coffee + rice + tablea, adds mock delivery, and produces the expected **₱489.00** review. The tests cancel a review, invalidate another through a tool call, then confirm only through the page button. They check the receipt, basket clearing, stock change, reset, reload, invalid JSON, sold-out products, search escaping, no horizontal overflow at 390px, and no captured JavaScript exceptions or console errors. Review opens with keyboard focus on the summary rather than immediately on confirmation.

**Lifecycle:** actual Next.js client navigation from help desk → home → shop unregisters the old tool set. Native discovery finds one help-desk tool, no tools on the home page, and exactly five shopping tools. Unit tests cover disposal, rollback after partial registration failure, and unmount while asynchronous registration is still pending. Development-mode browser runs check the Strict Mode lifecycle too.

## PWA checks

The production browser parsed the web app manifest with no errors and reported no installability errors. Cache Storage contained only the offline explanation and four icons. Both native and fallback runs verified offline navigation, a rendered offline icon, blocked basket writes, cancellation of an open review on disconnect, fresh state after reconnect/reload, and no silent reload during a same-version update check. Unit tests cover the manifest/icon dimensions, cache allowlist, old-version cleanup, and explicit activation message policy. OS installation and a full two-deployment upgrade of an installed app remain untested. See [PWA behavior](PWA.md).

## Visual checks

Reviewed desktop (1280 × 1000 viewport, full page) and mobile (390 × 844 viewport, full page) screenshots of the shop, help desk, and checkout review. Also opened the built shop in the ordinary Edge profile and manually checked the ₱489 review. That profile correctly reports rehearsal mode.

- [Shopping desktop](images/shop-desktop.png)
- [Shopping mobile](images/shop-mobile.png)
- [Checkout review](images/shop-review.png)
- [Help-desk desktop](images/native-desktop.png)
- [Help-desk mobile](images/native-mobile.png)

The screenshot files show deterministic native test calls, not an LLM conversation.

## Limits

- A real LLM agent's tool discovery, choices, handling of missing information, and browser-extension integration have not been tested. The panel is a deterministic caller.
- No public hosting deployment, public-origin trial token, or HTTPS event domain has been configured or tested. Public native WebMCP may require a supported origin trial or browser setting; HTTPS alone does not enable it. See [deployment requirements](DEPLOYMENT.md#native-webmcp-on-a-public-domain).
- Only the listed browser/runtime/OS were tested. Other browsers and assistive technologies are not verified. Responsive and focus checks are not a complete accessibility audit.
- The cart and confirmation model is a teaching example in browser memory, not production commerce authorization or payment security.

## Check a chosen deployment

After hosting is selected, repeat the built-route and browser checks on its real HTTPS origin. Confirm that ordinary visitors can use the UI and labeled fallback without signing in, then verify native support separately on the exact supported browser and origin. Do not infer public native support from the localhost test results.
