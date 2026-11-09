"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATALOG, createShop } from "../lib/shopping/domain.js";
import { makeShoppingTools } from "../lib/shopping/tools.js";
import ToolPanel from "./ToolPanel.jsx";

const money = (centavos) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    centavos / 100,
  );
const presets = {
  search_products: { query: "coffee", maxPricePhp: 200 },
  get_cart: {},
  set_cart_item: { productId: "coffee", quantity: 1 },
  set_delivery: { method: "delivery" },
  prepare_checkout: {},
};
const budget = 50000;

function BasketLines({ cart }) {
  return (
    <ul className="review-lines">
      {cart.items.map((item) => (
        <li key={item.productId}>
          <span>
            {item.quantity} × {item.name} <small>{item.unit}</small>
          </span>
          <strong>{money(item.lineTotalCentavos)}</strong>
        </li>
      ))}
    </ul>
  );
}

export default function Shop() {
  const shopRef = useRef(null);
  if (!shopRef.current) shopRef.current = createShop();
  const shop = shopRef.current;
  const [view, setView] = useState(() => shop.state());
  const [feedback, setFeedback] = useState(
    "Start with a coffee, a pantry staple, or something sweet.",
  );
  const [filters, setFilters] = useState({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const dialogRef = useRef(null);

  const actions = useMemo(() => {
    function update(operation, input, message) {
      if (!navigator.onLine)
        throw new Error(
          "You’re offline. Reconnect before changing or reviewing the basket.",
        );
      const result = operation(input);
      // The store is the source of truth; both UI and WebMCP refresh this snapshot.
      setView(shop.state());
      setFeedback(message);
      return result;
    }
    return {
      search_products: (input) => shop.searchProducts(input),
      get_cart: (input) => shop.getCart(input),
      set_cart_item: (input) =>
        update(
          shop.setCartItem,
          input,
          "Basket updated. Any changed basket needs a fresh checkout review.",
        ),
      set_delivery: (input) =>
        update(
          shop.setDelivery,
          input,
          "Fulfillment updated. The basket total includes the fee.",
        ),
      prepare_checkout: (input) =>
        update(
          shop.prepareCheckout,
          input,
          "Review is ready. No order has been created.",
        ),
    };
  }, [shop]);
  const tools = useMemo(() => makeShoppingTools(actions), [actions]);

  useEffect(() => {
    const offline = () => {
      // A review that was opened online cannot remain confirmable after a drop.
      // No action is queued for a later retry or replayed on reconnection.
      shop.cancelReview();
      setView(shop.state());
      setFeedback(
        "You’re offline. Review closed; reconnect and review the basket again.",
      );
    };
    window.addEventListener("offline", offline);
    return () => window.removeEventListener("offline", offline);
  }, [shop]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (view.review && !dialog.open) {
      dialog.showModal();
      // Read the summary before choosing an action; opening review should not
      // put keyboard focus straight on the confirmation button.
      dialog.querySelector("#review-title")?.focus();
    } else if (!view.review && dialog.open) dialog.close();
  }, [view.review]);

  function apply(action, input) {
    try {
      actions[action](input);
    } catch (error) {
      setFeedback(error.message);
    }
  }
  function cancelReview() {
    shop.cancelReview();
    setView(shop.state());
    setFeedback("Back to the basket. Nothing was ordered.");
  }
  function confirm() {
    try {
      if (!navigator.onLine)
        throw new Error(
          "You’re offline. Reconnect and review the basket again.",
        );
      // Confirmation uses the exact reviewed ID. A changed cart invalidates it in
      // the domain layer, even if this UI had not rendered the change yet.
      const result = shop.confirmReview(view.review?.id);
      setView(shop.state());
      setFeedback(
        `${result.order.id} confirmed locally. No payment or delivery will happen.`,
      );
    } catch (error) {
      setView(shop.state());
      setFeedback(error.message);
    }
  }

  const products = shop.searchProducts(filters).products;
  const cart = view.cart;
  const receipt = view.orders.at(-1);
  const remaining = budget - cart.totalCentavos;

  return (
    <main id="main" className="shop container">
      <header className="shop-hero">
        <div>
          <p className="eyebrow">PANTRY RUN / A MOCK SHOP</p>
          <h1>
            A good week starts
            <br />
            with a small basket.
          </h1>
          <p className="lead">
            Coffee for the morning. Rice for the week. Maybe a little tablea.
            <br className="desktop-break" /> See what fits in a ₱500 pantry run.
          </p>
        </div>
        <aside className="budget-note">
          <span className="budget-stamp">₱500</span>
          <p>A little basket challenge</p>
          <small>
            A planning target, not a checkout limit. All prices and orders are
            made up.
          </small>
        </aside>
      </header>
      <p className="mock-banner">
        Demo shop · No accounts, personal information, payments, or real orders.
        Your basket stays in this tab.
      </p>
      <div className="shop-layout">
        <section className="catalog" aria-labelledby="catalog-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PICK YOUR EVERYDAY ESSENTIALS</p>
              <h2 id="catalog-title">On the shelf</h2>
            </div>
            <span className="muted">Prices in PHP</span>
          </div>
          <form
            className="filters"
            onSubmit={(event) => {
              event.preventDefault();
              const next = {
                query,
                ...(category ? { category } : {}),
                ...(maxPrice !== "" ? { maxPricePhp: Number(maxPrice) } : {}),
              };
              try {
                shop.searchProducts(next);
                setFilters(next);
              } catch (error) {
                setFeedback(error.message);
              }
            }}
          >
            <div>
              <label htmlFor="search">Find a product</label>
              <input
                id="search"
                type="search"
                maxLength={60}
                placeholder="Coffee, rice, tablea…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="shop-category">Category</label>
              <select
                id="shop-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">Everything</option>
                <option value="pantry">Pantry</option>
                <option value="drinks">Coffee & chocolate</option>
                <option value="snacks">Snacks</option>
              </select>
            </div>
            <div>
              <label htmlFor="max-price">Up to ₱</label>
              <input
                id="max-price"
                type="number"
                min="0"
                max="10000"
                step="0.01"
                placeholder="Any price"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              />
            </div>
            <button className="secondary" type="submit">
              Find
            </button>
          </form>
          <p className="muted" id="search-count" aria-live="polite">
            {products.length} {products.length === 1 ? "product" : "products"}{" "}
            on this shelf
          </p>
          <div className="product-grid">
            {products.map((product) => {
              const detail = CATALOG.find((item) => item.id === product.id);
              const quantity =
                cart.items.find((item) => item.productId === product.id)
                  ?.quantity || 0;
              const atLimit = quantity >= product.stock;
              return (
                <article className="product-card" key={product.id}>
                  <div
                    className={`product-art ${detail.pack}`}
                    aria-hidden="true"
                  >
                    <div className="package">
                      <span>
                        PANTRY
                        <br />
                        <b>RUN</b>
                      </span>
                      <strong>{product.name}</strong>
                      <small>{product.unit}</small>
                    </div>
                  </div>
                  <div className="product-info">
                    <div className="product-heading">
                      <h3>{product.name}</h3>
                      <strong>{money(product.priceCentavos)}</strong>
                    </div>
                    <p className="unit">{product.unit}</p>
                    <p>{detail.note}</p>
                    <div className="stock-row">
                      <span>
                        {product.stock
                          ? `${product.stock} available`
                          : "Sold out"}
                      </span>
                      {quantity > 0 && (
                        <span className="in-cart">{quantity} in basket</span>
                      )}
                    </div>
                    <button
                      id={`add-${product.id}`}
                      disabled={atLimit}
                      onClick={() =>
                        apply("set_cart_item", {
                          productId: product.id,
                          quantity: quantity + 1,
                        })
                      }
                    >
                      {product.stock === 0
                        ? "Back another day"
                        : atLimit
                          ? "All available units in basket"
                          : `Add ${product.name}`}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {!products.length && (
            <p className="empty">
              Nothing on this shelf matches. Try a different name, category, or
              price.
            </p>
          )}
        </section>
        <aside className="basket" aria-labelledby="basket-title">
          <p className="eyebrow">YOUR PANTRY RUN</p>
          <div className="section-heading">
            <h2 id="basket-title">The basket</h2>
            <span id="cart-count" className="count">
              {cart.itemCount}
            </span>
          </div>
          {!cart.items.length ? (
            <p className="empty">
              A little room for something good.
              <br />
              Add an item from the shelf to start.
            </p>
          ) : (
            <ul id="cart-items" className="cart-items">
              {cart.items.map((item) => (
                <li key={item.productId}>
                  <div className="section-heading">
                    <strong>{item.name}</strong>
                    <span>{money(item.lineTotalCentavos)}</span>
                  </div>
                  <p className="unit">
                    {item.unit} · {money(item.unitPriceCentavos)} each
                  </p>
                  <div className="quantity">
                    <button
                      className="secondary"
                      aria-label={`Decrease ${item.name}`}
                      onClick={() =>
                        apply("set_cart_item", {
                          productId: item.productId,
                          quantity: item.quantity - 1,
                        })
                      }
                    >
                      −
                    </button>
                    <output aria-label={`${item.name} quantity`}>
                      {item.quantity}
                    </output>
                    <button
                      className="secondary"
                      aria-label={`Increase ${item.name}`}
                      disabled={
                        item.quantity >=
                        shop
                          .searchProducts()
                          .products.find(
                            (product) => product.id === item.productId,
                          ).stock
                      }
                      onClick={() =>
                        apply("set_cart_item", {
                          productId: item.productId,
                          quantity: item.quantity + 1,
                        })
                      }
                    >
                      +
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        apply("set_cart_item", {
                          productId: item.productId,
                          quantity: 0,
                        })
                      }
                    >
                      Remove <span className="sr-only">{item.name}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <label htmlFor="delivery">How would you get it?</label>
          <select
            id="delivery"
            value={cart.deliveryMethod}
            onChange={(event) =>
              apply("set_delivery", { method: event.target.value })
            }
          >
            <option value="pickup">Pickup · free</option>
            <option value="delivery">Demo delivery · ₱49.00</option>
          </select>
          <dl className="totals">
            <div>
              <dt>Items</dt>
              <dd id="subtotal">{money(cart.subtotalCentavos)}</dd>
            </div>
            <div>
              <dt>Fulfillment</dt>
              <dd>{money(cart.deliveryCentavos)}</dd>
            </div>
            <div className="total">
              <dt>Total</dt>
              <dd id="cart-total">{money(cart.totalCentavos)}</dd>
            </div>
          </dl>
          <div className="budget-guide">
            <div className="section-heading">
              <span>₱500 basket guide</span>
              <strong>
                {remaining >= 0
                  ? `${money(remaining)} left`
                  : `${money(-remaining)} over`}
              </strong>
            </div>
            <meter
              min="0"
              max={budget}
              value={Math.min(budget, cart.totalCentavos)}
              aria-label="Basket total toward 500 peso target"
            />
            <small>
              {remaining >= 0
                ? "A little planning goes a long way."
                : "Still fine for this demo. The target is just a guide."}
            </small>
          </div>
          <button
            id="review"
            className="full-width"
            disabled={!cart.items.length}
            onClick={() => apply("prepare_checkout", {})}
          >
            Review mock order →
          </button>
          <p className="fine">
            Review first. Confirm separately. No real checkout.
          </p>
          <p id="shop-feedback" role="status">
            {feedback}
          </p>
          {receipt && (
            <section id="receipt" className="receipt" aria-live="polite">
              <p className="eyebrow">MOCK RECEIPT</p>
              <h3>{receipt.id}</h3>
              <BasketLines cart={receipt.cart} />
              <p>
                <strong>Total: {money(receipt.cart.totalCentavos)}</strong>
              </p>
              <p>No money was charged. Nothing will be delivered.</p>
            </section>
          )}
          <button
            id="reset-shop"
            className="text-button"
            onClick={() => {
              shop.reset();
              setView(shop.state());
              setFeedback("Fresh basket. Demo stock and receipts reset.");
            }}
          >
            Start a fresh demo
          </button>
        </aside>
      </div>
      <ToolPanel tools={tools} presets={presets} />
      <footer className="shop-footer">
        <p>
          The buttons and tools share the same basket. Try{" "}
          <code>search_products</code>, <code>set_cart_item</code>, then{" "}
          <code>prepare_checkout</code>.
        </p>
        <a href="https://github.com/andresitodeguzman/webmcp/blob/main/docs/SHOPPING.md">
          How this example works ↗
        </a>
      </footer>

      <dialog
        ref={dialogRef}
        id="checkout-dialog"
        aria-labelledby="review-title"
        onCancel={(event) => {
          event.preventDefault();
          cancelReview();
        }}
      >
        {view.review && (
          <>
            <p className="eyebrow">ONE LAST LOOK</p>
            <h2 id="review-title" tabIndex={-1}>
              Review your mock order
            </h2>
            <p>Check the items and total. Nothing has been ordered yet.</p>
            <BasketLines cart={view.review.cart} />
            <dl className="totals">
              <div>
                <dt>
                  {view.review.cart.deliveryMethod === "pickup"
                    ? "Pickup"
                    : "Demo delivery"}
                </dt>
                <dd>{money(view.review.cart.deliveryCentavos)}</dd>
              </div>
              <div className="total">
                <dt>Total</dt>
                <dd id="review-total">
                  {money(view.review.cart.totalCentavos)}
                </dd>
              </div>
            </dl>
            <p className="mock-banner">
              Confirming creates a receipt only in this tab. No payment,
              address, or real order.
            </p>
            <div className="actions">
              <button id="confirm-order" onClick={confirm}>
                Confirm mock order
              </button>
              <button
                className="secondary"
                id="cancel-review"
                onClick={cancelReview}
              >
                Back to basket
              </button>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
