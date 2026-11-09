import test from "node:test";
import assert from "node:assert/strict";
import { createShop } from "../lib/shopping/domain.js";
import { makeShoppingTools } from "../lib/shopping/tools.js";

const add = (shop) => shop.setCartItem({ productId: "coffee", quantity: 1 });
test("shop: search combines name, category and maximum peso price without changing a basket", () => {
  const shop = createShop();
  assert.deepEqual(
    shop
      .searchProducts({ query: "COFFEE", category: "drinks", maxPricePhp: 200 })
      .products.map((p) => p.id),
    ["coffee"],
  );
  assert.equal(shop.searchProducts({ maxPricePhp: 100 }).products.length, 3);
  assert.equal(shop.getCart().cart.itemCount, 0);
  assert.throws(() => shop.searchProducts({ category: "unknown" }));
  assert.throws(() => shop.searchProducts({ maxPricePhp: "200" }));
  assert.throws(() => shop.searchProducts({ query: "<".repeat(61) }));
});
test("shop: setting absolute quantity is retry-safe and money uses centavos", () => {
  const shop = createShop();
  shop.setCartItem({ productId: "rice", quantity: 2 });
  const first = shop.getCart();
  assert.deepEqual(
    shop.setCartItem({ productId: "rice", quantity: 2 }).cart,
    first.cart,
  );
  assert.equal(first.cart.subtotalCentavos, 17000);
  assert.equal(
    shop.setDelivery({ method: "delivery" }).cart.totalCentavos,
    21900,
  );
  assert.equal(
    shop.setCartItem({ productId: "rice", quantity: 0 }).cart.totalCentavos,
    0,
  );
});
test("shop: invalid or sold-out requests cannot mutate the basket", () => {
  const shop = createShop();
  for (const input of [
    null,
    [],
    {},
    { productId: "unknown", quantity: 1 },
    { productId: "coffee", quantity: 1.5 },
    { productId: "coffee", quantity: -1 },
    { productId: "coffee", quantity: 6 },
    { productId: "chips", quantity: 1 },
    { productId: "coffee", quantity: 1, price: 1 },
  ])
    assert.throws(() => shop.setCartItem(input));
  assert.throws(() => shop.setDelivery({ method: "express" }));
  assert.equal(shop.getCart().cart.itemCount, 0);
});
test("shop: review and cancel leave stock and orders unchanged", () => {
  const shop = createShop();
  assert.throws(() => shop.prepareCheckout(), /Add an item/);
  add(shop);
  const review = shop.prepareCheckout().review;
  assert.deepEqual(shop.prepareCheckout().review, review);
  assert.equal(shop.state().orders.length, 0);
  assert.equal(shop.searchProducts({ query: "coffee" }).products[0].stock, 5);
  shop.cancelReview();
  assert.equal(shop.state().review, null);
  assert.equal(shop.getCart().cart.itemCount, 1);
  assert.throws(() => shop.confirmReview(review.id), /no longer current/);
});
test("shop: basket and fulfillment changes invalidate review; a retry with no change does not", () => {
  const shop = createShop();
  add(shop);
  let review = shop.prepareCheckout().review;
  add(shop);
  assert.equal(shop.state().review.id, review.id);
  shop.setDelivery({ method: "delivery" });
  assert.throws(() => shop.confirmReview(review.id), /no longer current/);
  review = shop.prepareCheckout().review;
  shop.setCartItem({ productId: "coffee", quantity: 2 });
  assert.throws(() => shop.confirmReview(review.id), /no longer current/);
});
test("shop: confirmation creates one immutable mock receipt, decrements local stock, and clears cart", () => {
  const shop = createShop();
  add(shop);
  shop.setDelivery({ method: "delivery" });
  const review = shop.prepareCheckout().review;
  const result = shop.confirmReview(review.id);
  assert.equal(result.order.cart.totalCentavos, 24400);
  assert.equal(result.order.id, "MOCK-001");
  assert.equal(shop.confirmReview(review.id).duplicate, true);
  result.order.cart.totalCentavos = 1;
  assert.equal(shop.state().orders[0].cart.totalCentavos, 24400);
  assert.equal(shop.state().orders.length, 1);
  assert.equal(shop.getCart().cart.itemCount, 0);
  assert.equal(shop.searchProducts({ query: "coffee" }).products[0].stock, 4);
});
test("shop: reset restores stock; an old review ID cannot confirm a new basket", () => {
  const shop = createShop();
  add(shop);
  const old = shop.prepareCheckout().review;
  shop.confirmReview(old.id);
  shop.reset();
  assert.equal(shop.searchProducts({ query: "coffee" }).products[0].stock, 5);
  add(shop);
  const fresh = shop.prepareCheckout().review;
  assert.notEqual(old.id, fresh.id);
  assert.throws(() => shop.confirmReview(old.id), /no longer current/);
  const snapshot = shop.state();
  snapshot.cart.items[0].quantity = 999;
  snapshot.review.cart.totalCentavos = 1;
  assert.equal(shop.state().review.cart.totalCentavos, 19500);
});
test("shop: tools cannot confirm checkout, validate empty schemas and honor cancellation", async () => {
  const shop = createShop();
  const actions = {
    search_products: (input) => shop.searchProducts(input),
    get_cart: (input) => shop.getCart(input),
    set_cart_item: (input) => shop.setCartItem(input),
    set_delivery: (input) => shop.setDelivery(input),
    prepare_checkout: (input) => shop.prepareCheckout(input),
  };
  const tools = makeShoppingTools(actions);
  assert.equal(tools.length, 5);
  assert.equal(
    tools.some((t) => /confirm/.test(t.name)),
    false,
  );
  assert.equal(
    tools.find((t) => t.name === "search_products").annotations.readOnlyHint,
    true,
  );
  const set = tools.find((t) => t.name === "set_cart_item");
  assert.equal(
    JSON.parse(await set.execute({ productId: "chips", quantity: 1 })).ok,
    false,
  );
  await assert.rejects(
    set.execute(
      { productId: "coffee", quantity: 1 },
      { signal: AbortSignal.abort() },
    ),
    { name: "AbortError" },
  );
  assert.equal(shop.getCart().cart.itemCount, 0);
  const read = tools.find((t) => t.name === "get_cart");
  assert.equal(JSON.parse(await read.execute({ unexpected: true })).ok, false);
  await set.execute({ productId: "coffee", quantity: 1 });
  await tools.find((t) => t.name === "prepare_checkout").execute({});
  assert.equal(shop.state().orders.length, 0);
});
