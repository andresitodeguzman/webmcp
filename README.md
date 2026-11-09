# WebMCP Learning Lab

Two small apps for learning how a person and a browser assistant can use the same website.

## What is WebMCP?

Imagine a shop with a clearly labeled service counter. Instead of an assistant guessing which button to press, the website offers named actions: **find a product**, **set its quantity**, or **review the basket**.

WebMCP is an experimental browser feature that lets a website offer those actions as **tools**. A tool is a JavaScript function with a name, a description, and rules for the information it accepts. The website still does the work and updates the page you can see.

In this project, clicking a button and calling its matching tool use the **same application code**.

## What can I try?

| Example | What you can do | Local address |
| --- | --- | --- |
| **Pantry Run** | Build a ₱500 basket with rice, kapeng barako, tablea, and snacks. Change quantities, choose pickup or mock delivery, then review a mock order. | [localhost:4173/shop](http://localhost:4173/shop) |
| **Community help desk** | Send a made-up support ticket through a form or a tool. See validation and duplicate handling in action. | [localhost:4173/help-desk](http://localhost:4173/help-desk) |

The app uses Next.js for pages and React for the interactive parts. There is no AI model inside it. The tool panel lets you make predictable tool calls yourself, so you can learn without an API key.

## Run it on your computer

Install [Node.js 24](https://nodejs.org/), then open a terminal:

```sh
git clone https://github.com/andresitodeguzman/webmcp.git
cd webmcp
npm ci
npm run dev
```

`npm ci` installs the exact dependencies in the lockfile. `npm run dev` starts the local app. Open **[http://localhost:4173](http://localhost:4173)**. Stop it with Ctrl+C.

Already cloned the repo? Pull the latest changes, run `npm ci`, then `npm run dev` again. This version uses Next.js; the older standalone server is no longer needed.

## Try the shopping example

1. Open **Pantry Run**. Add one **Kapeng barako**, one **Dinorado rice**, and one **Tablea**.
2. Choose **Demo delivery**. The total should be **₱489.00**, including the made-up ₱49 delivery fee.
3. Click **Review mock order**. Check the summary. **Back to basket** cancels the review. **Confirm mock order** creates a local mock receipt.
4. Click **Start a fresh demo**, then try the tool panel below the shop. Choose `set_cart_item`, keep the sample arguments, and run it. The same basket updates.
5. Repeat that call. Quantity stays at one: the tool sets the quantity instead of blindly adding another item.
6. Try `prepare_checkout`. It opens a review; it cannot confirm an order. A basket or delivery change makes the old review invalid.

The ₱500 target is a planning game, not a spending limit. Prices and stock are fictional.

## Try the help desk

Open **Help desk**. **Silip muna** previews the message without creating a ticket. **Ipadala ang ticket** submits it. Run the tool with the same message: it returns the existing ticket instead of creating a duplicate. Try a summary shorter than five characters to see a validation error.

## What if my browser says “Rehearsal mode”?

The page still works. There are two ways to run the tool panel:

- **Native WebMCP:** a compatible browser registers, discovers, and calls the real browser tools.
- **Rehearsal:** the panel calls the same JavaScript handler directly. This teaches the application logic, but it is **not** a native WebMCP test.

WebMCP is experimental. A public HTTPS address alone does not switch it on. Native support may need an experimental development flag or a valid, supported **origin trial**—a browser vendor's temporary test program for a specific website. Check [Chrome's current setup instructions](https://developer.chrome.com/docs/ai/webmcp). Older examples using `navigator.modelContext` target a different API.

The panel is not an AI agent. Trying a real agent also requires a compatible browser client, which may have its own model and account requirements.

## Is this a real shop?

No. There are no payments, addresses, accounts, order APIs, or delivery bookings. A confirmed mock order only changes memory in your current tab. Refreshing, leaving the example, or resetting it clears that state. Different visitors do not share baskets or tickets.

The review button is a learning example, not production payment security. A real shop needs server-side authorization, pricing and stock checks, payment handling, and durable order storage.

## Can I install it as an app?

Yes. This is also a **PWA** (Progressive Web App): a website your browser can add to your home screen or dock. Use **Install app** when offered, or your browser’s app installation menu. On iPhone or iPad, look for **Add to Home Screen** in the Share menu.

Installation does **not** enable WebMCP. The same browser compatibility rules above still apply.

Offline, the app shows a reconnect screen instead of an old shopping page. It caches only that explanation and the app icons. Open reviews close when the connection drops; changes and confirmation pause. No basket, ticket, receipt, or checkout action is saved or queued. Reconnect and review again, or reload for a fresh demo. Updates wait for **Update app · resets demo** rather than silently interrupting a basket. See [the PWA guide](docs/PWA.md).

## Where should I look in the code?

- [components/Shop.jsx](components/Shop.jsx): the shop buttons and tool actions update the same basket.
- [lib/shopping/domain.js](lib/shopping/domain.js): prices, stock, validation, and review rules. Prices use whole **centavos** to avoid rounding errors.
- [lib/shopping/tools.js](lib/shopping/tools.js): the five tool descriptions and input rules, called **JSON Schemas**.
- [components/ToolPanel.jsx](components/ToolPanel.jsx): browser-only registration, native calls, and the labeled fallback.
- [lib/webmcp/register.js](lib/webmcp/register.js): removes tools when a page closes or changes, including interrupted registration.
- [components/HelpDesk.jsx](components/HelpDesk.jsx) and [src/](src/): the smaller ticket example.

Comments explain the important boundaries. Start with a button handler, follow it into the domain function, then find the matching tool.

## Check it and share it

```sh
npm run check             # Syntax checks and 22 logic tests
npm run build             # Make the production app
npm run test:production   # Check the built pages and JavaScript assets
npm run test:browser      # Optional: installed Chromium-compatible browser needed
npm start                 # Run the production app at localhost:3000
```

For Edge on macOS:

```sh
CHROME_BIN="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" npm run test:browser
```

The browser test checks both examples in native and rehearsal modes using temporary profiles. It fails if native support does not work; it does not count fallback as a native pass.

The app is live at **[webmcp-learning-lab.vercel.app](https://webmcp-learning-lab.vercel.app)**—no sign-in needed. Try [Pantry Run](https://webmcp-learning-lab.vercel.app/shop) or the [help desk](https://webmcp-learning-lab.vercel.app/help-desk), and install it from a supporting browser. See [deployment details](docs/DEPLOYMENT.md).

## Learn more

- [Shopping walkthrough and tool guide](docs/SHOPPING.md)
- [Practice exercises](docs/EXERCISES.md)
- [What was tested and what still has limits](docs/VERIFICATION.md)
- [Official WebMCP setup](https://developer.chrome.com/docs/ai/webmcp) and [JavaScript API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [WebMCP proposal](https://github.com/webmachinelearning/webmcp) and [security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) and [deployment](https://nextjs.org/docs/app/getting-started/deploying)

WebMCP works with an open web page. A backend MCP server exposes a service through a separate connection. They can complement each other; this project demonstrates the browser path.

API references were checked on **9 November 2026**. No open-source license has been selected yet; the repository owner should choose one before inviting code reuse beyond normal GitHub viewing and forking rights.
