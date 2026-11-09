// Both the form and the tool use this application logic.
export function createTicketStore() {
  let tickets = [];
  let nextId = 1;

  return {
    // Return a copy so a tool caller cannot edit the store through its result.
    list: () => structuredClone(tickets),

    reset() {
      tickets = [];
      nextId = 1;
    },

    submit(input) {
      // JSON Schema helps callers, but this function is the validation boundary
      // used by both the form and tools. Never trust a caller's shape or fields.
      if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new Error("Input must be an object.");
      }
      if (
        Object.keys(input).some((key) => !["summary", "category"].includes(key))
      ) {
        throw new Error("Unexpected input field.");
      }
      if (
        typeof input.summary !== "string" ||
        input.summary.trim().length < 5 ||
        input.summary.trim().length > 120
      ) {
        throw new Error("Summary must contain 5–120 characters.");
      }
      if (!["account", "billing", "other"].includes(input.category)) {
        throw new Error("Choose account, billing, or other.");
      }

      const summary = input.summary.trim();
      // Demo-only deduplication: repeating a request in this tab is harmless.
      const existing = tickets.find(
        (ticket) =>
          ticket.summary === summary && ticket.category === input.category,
      );
      if (existing) {
        return { ok: true, duplicate: true, ticket: structuredClone(existing) };
      }

      const ticket = {
        id: `DEMO-${String(nextId++).padStart(3, "0")}`,
        summary,
        category: input.category,
        status: "received",
      };
      tickets.push(ticket);
      return { ok: true, duplicate: false, ticket: structuredClone(ticket) };
    },
  };
}
