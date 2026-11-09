const emptySchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

export function makeShoppingTools(actions) {
  const definitions = [
    {
      name: "search_products",
      description:
        "Search the fictional Pantry Run catalog. Prices are in PHP and stock is local to this tab. Sold-out products are included with stock 0. Use returned product IDs for cart changes.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            maxLength: 60,
            description: "Product name or category to search.",
          },
          category: { type: "string", enum: ["pantry", "drinks", "snacks"] },
          maxPricePhp: {
            type: "number",
            minimum: 0,
            maximum: 10000,
            description: "Maximum price of one unit in pesos, not centavos.",
          },
        },
        additionalProperties: false,
      },
      readOnly: true,
    },
    {
      name: "get_cart",
      description:
        "Read the current demo basket, delivery choice and totals. Monetary amounts are integer PHP centavos. No state changes.",
      inputSchema: emptySchema,
      readOnly: true,
    },
    {
      name: "set_cart_item",
      description:
        "Set the absolute quantity of a catalog product in the demo basket. Repeating the same quantity is safe. Use 0 to remove it. Enforces available stock. Any actual change invalidates a pending checkout review. No purchase occurs.",
      inputSchema: {
        type: "object",
        properties: {
          productId: {
            type: "string",
            description: "An ID returned by search_products.",
          },
          quantity: {
            type: "integer",
            minimum: 0,
            maximum: 10,
            description:
              "Absolute quantity, not an amount to add. 0 removes the product.",
          },
        },
        required: ["productId", "quantity"],
        additionalProperties: false,
      },
      readOnly: false,
    },
    {
      name: "set_delivery",
      description:
        "Choose free pickup or simulated delivery for 49 pesos. Invalidates a pending review if changed. No address, delivery booking or real payment is involved.",
      inputSchema: {
        type: "object",
        properties: {
          method: { type: "string", enum: ["pickup", "delivery"] },
        },
        required: ["method"],
        additionalProperties: false,
      },
      readOnly: false,
    },
    {
      name: "prepare_checkout",
      description:
        "Open a review of the exact demo basket, delivery fee and total. Does not place an order. The user can cancel or use the page’s Confirm mock order button. There is no tool to confirm an order.",
      inputSchema: emptySchema,
      readOnly: false,
    },
  ];

  return definitions.map(({ readOnly, ...definition }) => ({
    ...definition,
    // All effects are simulated in memory; no real-world transaction occurs.
    annotations: {
      readOnlyHint: readOnly,
      consequentialHint: false,
      untrustedContentHint: false,
    },
    async execute(input, { signal } = {}) {
      if (signal?.aborted)
        throw new DOMException("Cancelled before execution", "AbortError");
      try {
        return JSON.stringify(actions[definition.name](input));
      } catch (error) {
        return JSON.stringify({ ok: false, error: error.message });
      }
    },
  }));
}
