# Installing the app and using it offline

A Progressive Web App (PWA) is an installable website. Installation adds a home-screen or dock entry and can open the app without the browser's usual address bar. It does not install an AI model or enable native WebMCP.

## Install

Open [the public HTTPS site](https://webmcp-learning-lab.vercel.app) in a supporting browser. Use the app's **Install app** button if offered, the browser's installation menu, or **Add to Home Screen** / **Add to Dock**. The exact UI depends on the browser and operating system. Declining installation does not prevent normal use.

`app/manifest.js` provides a stable app ID, root scope/start URL, standalone display mode, colors, shortcuts to both examples, PNG icons at 192px and 512px, and a padded maskable icon. An Apple touch icon is also included. `scripts/generate-icons.py` regenerates these original geometric icons without an image service or extra package.

Browser installability checks passed on both localhost and the public HTTPS origin in Edge 157.0.4341.42; the ordinary browser also offered an Install app button, but a complete OS installation and iOS/Android installation have not been performed. Browser install promotion can also depend on engagement or platform policy.

## Offline means an explanation, not an old checkout

`public/sw.js` is registered in production only. It caches exactly five public files:

- `/offline.html`
- `/icons/icon-192.png`
- `/icons/icon-512.png`
- `/icons/maskable-512.png`
- `/icons/apple-touch-icon.png`

A full-page navigation always tries the network with browser page caching bypassed. If the network is unavailable, the worker serves the static reconnect screen. Icons remain available on that screen. Other requests—including Next.js route-data fetches, application scripts, arbitrary assets, and non-GET requests—are not intercepted by the worker.

The worker never stores or queues baskets, tickets, receipts, input text, payments, or checkout actions. There is no background sync or automatic replay. An already-open app can still show its in-memory basket while disconnected, but writes and confirmation are blocked. A connection loss cancels an open review. Reconnecting does not confirm anything; a fresh review is required. Reloading resets the browser-memory example.

A browser's own Next.js prefetch or HTTP cache is separate from service-worker Cache Storage; offline checks still guard state changes if an already-loaded route remains visible.

## Updates are deliberate

A new worker installs into a waiting state while the old app is open. The UI offers **Update app · resets demo**. Only choosing that button sends `SKIP_WAITING` and reloads when the new worker takes control. Checking for updates does not reload a basket. Closing all app windows also allows the normal browser update lifecycle.

When changing the offline page, icons, or cache policy, bump the `CACHE` version in `public/sw.js`. Activation removes only obsolete `webmcp-offline-*` caches and preserves unrelated caches. The worker script is served with `no-cache, no-store, must-revalidate`; registration also uses `updateViaCache: 'none'`.

The tests cover same-version update checks without reload, waiting/activation message policy, and cleanup of obsolete cache versions. A full two-deployment replacement while an installed OS app is open has not been tested yet.

## Check it locally

Build first; development mode deliberately does not register the worker:

```sh
npm run check
npm run build
npm run test:production
CHROME_BIN="/path/to/chrome-or-edge" npm run test:browser
```

The browser test parses the served manifest, asks the browser for installability errors, inspects the exact cached files, and simulates disconnection for both the page and service-worker network targets. It verifies the reconnect screen, offline icon, blocked writes, review cancellation, fresh state on reload, and an update check that preserves the current basket. It does not click an OS install prompt or change the normal browser profile.

To test a public deployment without starting a local server:

```sh
TEST_BASE_URL="https://the-deployed-domain.example" CHROME_BIN="/path/to/chrome-or-edge" npm run test:browser
```

For a real app, offline commerce needs a separately designed server-authorized workflow. This learning app deliberately avoids offline checkout.
