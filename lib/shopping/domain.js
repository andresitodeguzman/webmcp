// All prices are illustrative Philippine pesos, stored as integer centavos.
export const CATALOG = Object.freeze(
  [
    {
      id: "rice",
      name: "Dinorado rice",
      unit: "1 kg",
      category: "pantry",
      priceCentavos: 8500,
      stock: 8,
      note: "A dependable start for the week.",
      pack: "rice",
    },
    {
      id: "coffee",
      name: "Kapeng barako",
      unit: "250 g",
      category: "drinks",
      priceCentavos: 19500,
      stock: 5,
      note: "Ground coffee for a slower morning.",
      pack: "coffee",
    },
    {
      id: "vinegar",
      name: "Coconut vinegar",
      unit: "375 ml",
      category: "pantry",
      priceCentavos: 6500,
      stock: 6,
      note: "A pantry staple, ready for adobo.",
      pack: "bottle",
    },
    {
      id: "tablea",
      name: "Tablea",
      unit: "150 g",
      category: "drinks",
      priceCentavos: 16000,
      stock: 4,
      note: "For a proper cup of hot chocolate.",
      pack: "tablea",
    },
    {
      id: "mango",
      name: "Dried mango",
      unit: "100 g",
      category: "snacks",
      priceCentavos: 13500,
      stock: 3,
      note: "Something sweet for the afternoon.",
      pack: "mango",
    },
    {
      id: "chips",
      name: "Banana chips",
      unit: "100 g",
      category: "snacks",
      priceCentavos: 7500,
      stock: 0,
      note: "Taking a short shelf break. Sold out.",
      pack: "chips",
    },
  ].map((product) => Object.freeze(product)),
);

export const DELIVERY_FEES = Object.freeze({ pickup: 0, delivery: 4900 });

function fields(input, allowed) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Arguments must be an object.");
  }
  if (Object.keys(input).some((key) => !allowed.includes(key))) {
    throw new Error("Unexpected argument. Check the tool contract.");
  }
}

export function createShop() {
  let inventory, cart, method, revision, review, orders;
  let nextReview = 1;
  let nextOrder = 1;

  function reset() {
    inventory = new Map(CATALOG.map((product) => [product.id, product.stock]));
    cart = new Map();
    method = "pickup";
    revision = 0;
    review = null;
    orders = [];
    nextOrder = 1;
    // Keep review IDs unique across resets in this tab.
  }
  reset();

  function changed() {
    revision += 1;
    review = null; // A review is only valid for the exact basket and delivery choice.
  }

  function snapshot() {
    const items = [...cart].map(([id, quantity]) => {
      const product = CATALOG.find((item) => item.id === id);
      return {
        productId: id,
        name: product.name,
        unit: product.unit,
        quantity,
        unitPriceCentavos: product.priceCentavos,
        lineTotalCentavos: quantity * product.priceCentavos,
      };
    });
    const subtotalCentavos = items.reduce(
      (sum, item) => sum + item.lineTotalCentavos,
      0,
    );
    const deliveryCentavos = items.length ? DELIVERY_FEES[method] : 0;
    return {
      currency: "PHP",
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalCentavos,
      deliveryMethod: method,
      deliveryCentavos,
      totalCentavos: subtotalCentavos + deliveryCentavos,
      revision,
    };
  }

  return {
    reset,
    state: () => structuredClone({ cart: snapshot(), review, orders }),

    searchProducts(input = {}) {
      fields(input, ["query", "category", "maxPricePhp"]);
      const { query = "", category, maxPricePhp } = input;
      if (typeof query !== "string" || query.length > 60) {
        throw new Error(
          "Search query must be a string of at most 60 characters.",
        );
      }
      if (
        category !== undefined &&
        !["pantry", "drinks", "snacks"].includes(category)
      ) {
        throw new Error("Choose pantry, drinks, or snacks.");
      }
      if (
        maxPricePhp !== undefined &&
        (typeof maxPricePhp !== "number" ||
          !Number.isFinite(maxPricePhp) ||
          maxPricePhp < 0 ||
          maxPricePhp > 10000)
      ) {
        throw new Error(
          "Maximum price must be a number from 0 to 10000 pesos.",
        );
      }
      const queryText = query.trim().toLowerCase();
      const products = CATALOG.filter(
        (product) =>
          `${product.id} ${product.name} ${product.category} ${product.note}`
            .toLowerCase()
            .includes(queryText) &&
          (!category || product.category === category) &&
          (maxPricePhp === undefined ||
            product.priceCentavos <= Math.round(maxPricePhp * 100)),
      ).map(({ id, name, unit, category, priceCentavos }) => ({
        id,
        name,
        unit,
        category,
        priceCentavos,
        stock: inventory.get(id),
      }));
      return { ok: true, currency: "PHP", products };
    },

    getCart(input = {}) {
      fields(input, []);
      return { ok: true, cart: snapshot() };
    },

    setCartItem(input) {
      fields(input, ["productId", "quantity"]);
      if (
        typeof input.productId !== "string" ||
        !inventory.has(input.productId)
      ) {
        throw new Error("Unknown product ID. Search the catalog first.");
      }
      if (
        !Number.isInteger(input.quantity) ||
        input.quantity < 0 ||
        input.quantity > 10
      ) {
        throw new Error(
          "Quantity must be an integer from 0 to 10. Use 0 to remove an item.",
        );
      }
      if (input.quantity > inventory.get(input.productId)) {
        throw new Error(
          `Only ${inventory.get(input.productId)} available. Lower the quantity.`,
        );
      }
      if ((cart.get(input.productId) || 0) !== input.quantity) {
        if (input.quantity === 0) cart.delete(input.productId);
        else cart.set(input.productId, input.quantity);
        changed();
      }
      // Absolute quantity makes retries safe: set 2 twice still means 2.
      return { ok: true, cart: snapshot() };
    },

    setDelivery(input) {
      fields(input, ["method"]);
      if (!Object.hasOwn(DELIVERY_FEES, input.method)) {
        throw new Error("Choose pickup or delivery.");
      }
      if (method !== input.method) {
        method = input.method;
        changed();
      }
      return { ok: true, cart: snapshot() };
    },

    prepareCheckout(input = {}) {
      fields(input, []);
      if (cart.size === 0)
        throw new Error("Add an item before reviewing checkout.");
      review ??= {
        id: `REVIEW-${nextReview++}`,
        cart: snapshot(),
        status: "awaiting_confirmation",
      };
      return {
        ok: true,
        review: structuredClone(review),
        nextStep:
          "Review the basket on the page. Only the Confirm mock order button creates a local demo receipt.",
      };
    },

    cancelReview() {
      review = null;
    },

    // Called by the confirmation UI, deliberately not exposed as a WebMCP tool.
    confirmReview(reviewId) {
      const existing = orders.find((order) => order.reviewId === reviewId);
      if (existing)
        return { ok: true, duplicate: true, order: structuredClone(existing) };
      if (
        !review ||
        review.id !== reviewId ||
        review.cart.revision !== revision
      ) {
        throw new Error(
          "This review is no longer current. Review the basket again.",
        );
      }
      const order = {
        id: `MOCK-${String(nextOrder++).padStart(3, "0")}`,
        reviewId,
        status: "mock_confirmed",
        cart: structuredClone(review.cart),
      };
      for (const [id, quantity] of cart)
        inventory.set(id, inventory.get(id) - quantity);
      orders.push(order);
      cart.clear();
      changed();
      return { ok: true, duplicate: false, order: structuredClone(order) };
    },
  };
}
