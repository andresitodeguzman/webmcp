export function makeTicketTool(submit) {
  return {
    name: "submit_demo_ticket",
    description:
      "Create a simulated support ticket in this page only. No email, account, payment, or external service is involved. Repeating an identical request returns the existing ticket. Ask the user for the issue summary and category if missing.",
    inputSchema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          minLength: 5,
          maxLength: 120,
          description: "A short description of the support issue.",
        },
        category: {
          type: "string",
          enum: ["account", "billing", "other"],
          description: "The issue category.",
        },
      },
      required: ["summary", "category"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      consequentialHint: false,
      untrustedContentHint: true,
    },

    async execute(input, { signal } = {}) {
      // Stop before changing state if the browser has already cancelled the call.
      if (signal?.aborted) {
        throw new DOMException("Cancelled before execution", "AbortError");
      }
      try {
        // Returning a JSON string keeps the result structured and easy to inspect.
        return JSON.stringify(submit(input));
      } catch (error) {
        return JSON.stringify({ ok: false, error: error.message });
      }
    },
  };
}
