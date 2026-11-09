export function makeTicketTool(submit) {
  return {
    name: 'submit_demo_ticket',
    description: 'Create a simulated support ticket in this page only. No email, account, payment, or external service is involved. Repeating an identical request returns the existing ticket. Ask the user for the issue summary and category if missing.',
    inputSchema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          minLength: 5,
          maxLength: 120,
          description: 'A short description of the support issue.',
        },
        category: {
          type: 'string',
          enum: ['account', 'billing', 'other'],
          description: 'The issue category.',
        },
      },
      required: ['summary', 'category'],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      consequentialHint: false,
      untrustedContentHint: true,
    },

    async execute(input, { signal } = {}) {
      if (signal?.aborted) {
        throw new DOMException('Cancelled before execution', 'AbortError');
      }
      try {
        return JSON.stringify(submit(input));
      } catch (error) {
        return JSON.stringify({ ok: false, error: error.message });
      }
    },
  };
}

// Progressive enhancement: never install a fake API on document or navigator.
export async function registerTicketTool(context, tool) {
  if (typeof context?.registerTool !== 'function') {
    return { native: false, dispose() {} };
  }

  const controller = new AbortController();
  try {
    await context.registerTool(tool, { signal: controller.signal });
  } catch (error) {
    controller.abort();
    throw error;
  }
  return { native: true, dispose: () => controller.abort() };
}
