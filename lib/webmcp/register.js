// The caller's signal lets a React effect cancel registration even before this
// async function finishes. A private controller rolls back partial registrations.
export async function registerTools(context, tools, { signal } = {}) {
  if (typeof context?.registerTool !== "function") {
    return { native: false, canInvoke: false, dispose() {} };
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const dispose = () => {
    signal?.removeEventListener("abort", abort);
    controller.abort();
  };

  try {
    for (const tool of tools) {
      controller.signal.throwIfAborted();
      await context.registerTool(tool, { signal: controller.signal });
    }
    controller.signal.throwIfAborted();
  } catch (error) {
    dispose();
    throw error;
  }
  return {
    native: true,
    canInvoke:
      typeof context.getTools === "function" &&
      typeof context.executeTool === "function",
    dispose,
  };
}
