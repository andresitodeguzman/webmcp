# Pantry Run: follow one basket from shelf to receipt

Pantry Run is a fictional Filipino pantry shop. The ₱500 basket guide adds a small challenge; it is not a checkout restriction. No part of this example creates a real order.

Start with the [README setup](../README.md#run-it-on-your-computer), then open `/shop`.

## One useful shopping flow

Search for coffee under ₱200. Add one `coffee`, one `rice`, and one `tablea`. Choose `delivery`. The items cost ₱440; mock delivery costs ₱49; the total is ₱489.

You can do that through the ordinary controls, the tool panel, or a mixture of both. The basket is shared. A compatible agent could be asked: “Build a basket with one coffee, one rice, and one tablea. Include delivery and keep it under ₱500. Show me the review before any confirmation.” Actual agent behavior is not guaranteed or bundled with this app.

## The five tools

| Tool | Example arguments | Effect |
| --- | --- | --- |
| `search_products` | `{"query":"coffee","maxPricePhp":200}` | Read matching products and local stock. Optional category: `pantry`, `drinks`, or `snacks`. |
| `get_cart` | `{}` | Read items, quantities, fulfillment, and totals. |
| `set_cart_item` | `{"productId":"coffee","quantity":1}` | Set an absolute quantity. Use zero to remove it. |
| `set_delivery` | `{"method":"delivery"}` | Choose free `pickup` or mock `delivery` for ₱49. |
| `prepare_checkout` | `{}` | Open the exact basket for review. Does not create an order. |

Search price limits use **pesos**. Returned monetary fields end in `Centavos` and use integer **centavos**: `48900` means ₱489.00. The schema documents allowed inputs; the domain code validates them again because callers can bypass browser form controls.

The tools intentionally do not accept price, total, payment, address, or an “approved” flag. Those values cannot be supplied by a caller as a shortcut to checkout.

## Why quantities are set instead of added

A tool call might be retried. “Set coffee to 1” twice still means one coffee. “Add 1 coffee” twice would mean two. Human **Add** buttons calculate the next quantity, then call the same `set_cart_item` action. Stock limits apply to both paths. Sold-out banana chips make that behavior easy to try.

## Review is a separate state

```text
Browse → Set quantities → Choose fulfillment → Prepare review
                                             ├─ Back to basket: no order
                                             └─ Confirm mock order: local receipt
```

Preparing a review captures a basket snapshot and its revision number. Changing items or fulfillment clears that review. A stale review ID is rejected even if a user clicks an old confirmation button before React redraws the page.

There is no `confirm_order` WebMCP tool. The page's **Confirm mock order** button calls the domain confirmation function. The resulting receipt is immutable, repeated confirmation of the same review returns the existing receipt, and local stock decreases. Reset restores the original stock.

This separation teaches an application boundary. It is not a security guarantee that only a human can confirm: a general browser automation client can also click page controls. A real shop must enforce authorization, consent, inventory, prices, idempotency, and payments on the server.

## How React and WebMCP stay in sync

1. `components/Shop.jsx` keeps one store instance in a React ref for this mounted example. Mutable state is not shared between server requests or visitors.
2. The action functions call the store, then give React a fresh snapshot to display. Tool execution uses those same functions.
3. `components/ToolPanel.jsx` registers tools in an effect after the browser mounts the page. It never accesses `document` during server rendering.
4. `lib/webmcp/register.js` ties the registrations to an abort signal. Leaving the route unregisters the tools, even if registration was still pending. Partial registration failures are rolled back.
5. Stable action/tool objects prevent registration on every quantity change. React's development cleanup cycle is supported.

The read-only tools are labeled `readOnlyHint: true`. Write tools are false. `consequentialHint` is false because every effect in this example is a simulation. These hints describe behavior; they are not access controls. Returned catalog text is authored by this app, rather than external user-generated content.

## Try these edge cases

- Ask for six coffees when only five are available: an error, with the basket unchanged.
- Set quantity to 1.5, provide an unknown product ID, or add a `price` argument: rejected.
- Prepare an empty basket: rejected.
- Prepare a review, change fulfillment through a tool, and try to use the old review: invalidated.
- Cancel review: items and stock remain unchanged.
- Confirm, then search for coffee again: local stock has decreased.
- Refresh: the basket, stock, receipts, and tool registrations start fresh.
