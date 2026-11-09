# Deploy the learning app

The repository contains a standard Next.js App Router app, pinned to Next.js 16.4.5 and React 19.3.1. Node.js 24 is the tested runtime. There are no database, payment, AI, or account services to provision, and no environment variables are required.

No public app has been deployed as part of this repository change. Choose a hosting account, project, and domain before deploying.

## Build and check locally

```sh
npm ci
npm run check
npm run build
npm run test:production
npm start
```

Open `http://localhost:3000`, `/shop`, and `/help-desk`. A successful development server alone does not verify the production build. The browser tests also run against the built app:

```sh
CHROME_BIN="/path/to/a/compatible/chrome-or-edge" npm run test:browser
```

`npm start` uses the hosting provider's `PORT` environment variable, or 3000 locally. Do not use `npm run dev` as a production server.

## A Next.js host, such as Vercel

1. Import `andresitodeguzman/webmcp` into the chosen hosting account.
2. Use the repository root, Next.js framework preset, Node 24, `npm ci`, and `npm run build`.
3. Keep environment variables empty for this mock app. No credentials belong in the repository.
4. Check a preview build before making it public. Test the root page, both examples, native/fallback status, mock order review, and mobile layout.
5. Publish only after the destination and account are agreed. Confirm the final HTTPS address and use that exact address for any origin-trial setup.

A Git-integrated host may automatically publish later pushes to its production branch. Check that behavior when connecting the repository. See [Next.js deployment options](https://nextjs.org/docs/app/getting-started/deploying) and [Vercel Git deployments](https://vercel.com/docs/git).

## Other Node.js hosts

A host that supports Node 24 can run `npm ci`, `npm run build`, then `npm start`. Use the provider's HTTPS endpoint or reverse proxy. The local app does not include TLS certificates or infrastructure configuration. A static-only host needs a separate Next.js static-export configuration; this repo currently uses the standard Next.js build/start flow.

The three pages are prerendered, while their interactive state runs in the visitor's browser. The server serves pages and assets; there are no order or ticket API routes. The Next.js dependency adds a build and runtime requirement compared with the original plain-JavaScript example, but provides clear routes, React components, and a familiar deployment path.

## Native WebMCP on a public domain

**HTTPS is necessary for a normal public secure context, but it does not enable an experimental API by itself.**

- Local developers can follow [Chrome's WebMCP testing-flag instructions](https://developer.chrome.com/docs/ai/webmcp).
- A public site may need a supported browser/build and a valid **origin-trial token** for that exact origin, subject to the current trial's availability, expiry, and restrictions. Follow [Chrome's origin-trial setup](https://developer.chrome.com/docs/web-platform/origin-trials) and the current WebMCP documentation.
- Once obtained by the site owner, a trial token is intentionally delivered publicly as an `Origin-Trial` response header or supported meta tag. This repository does not request, generate, or embed one. Configure it for the agreed domain through the host or app only after verifying the trial's current instructions.
- The app detects `document.modelContext` at runtime. It shows a native status only after registration succeeds. If native discovery/execution methods are missing, the panel explicitly uses the rehearsal handler.
- The `tools=(self)` permissions policy keeps tools same-origin. It does not turn on WebMCP, replace a trial token, or grant arbitrary cross-origin access.

For attendees, the ordinary interface and labeled rehearsal panel remain usable without experimental browser settings. Do not describe rehearsal results as native WebMCP results. There is no bundled LLM agent or browser extension; optional clients may have separate keys, models, and data-sharing requirements.

## Public-demo boundaries

- Catalog prices, stock, shipping fees, receipts, and support tickets are synthetic.
- No payment, address, email, or account form exists. Use made-up text in help-desk tickets; it stays in the current tab.
- State is held in memory per mounted browser example. Visitors do not share baskets or stock. Navigation, refresh, and reset clear the example.
- Tool registration is cleaned up when switching routes. The shopping tools cannot directly confirm an order.
- Dependencies are pinned in `package-lock.json`. Keep Next.js and React patched and rerun the checks before public updates.

Before sharing a URL, confirm that no hosting login wall blocks attendees, the expected HTTPS domain is used, and both example routes load on an ordinary browser with native WebMCP unavailable. Do not disable hosting protection until the owner has chosen the intended public audience.
