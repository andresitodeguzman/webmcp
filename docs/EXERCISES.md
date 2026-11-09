# Learn by changing it

## 1. Change the button (5 minutes)
Rename “Ipadala ang ticket” and move it before “Silip muna”. Reload.

**Pass:** human controls still work, and `submit_demo_ticket` still creates a ticket without selecting either button. The point is a stable semantic interface, not a guarantee that all visual automation fails.

## 2. Add a category (10 minutes)
Add `technical` to the select, JSON Schema enum and application validator. Write a test.

**Pass:** both UI and tool accept it; unknown categories remain rejected. Explain why changing only the schema does not change business logic.

## 3. Add a read-only tool (15 minutes)
Create `list_demo_tickets`, with an empty object schema, `readOnlyHint: true`, and `untrustedContentHint: true` because summaries contain user text. Register it with the same lifecycle.

**Pass:** it returns a snapshot without changing ticket count. Mutating a returned object cannot mutate the store. It reveals only the current tab's demo tickets.

## 4. Observe an agent (10 minutes, optional)
Use an approved compatible browser tool client. Ask it to create a synthetic ticket. Capture the discovered schema, exact tool call and result. Then ask with the category missing.

**Pass:** the agent asks for the missing category instead of making an unsupported claim. Assess actual behavior; a good description does not guarantee good agent decisions. Do not paste private support tickets or API keys into the demo.

## 5. Design production safety (discussion)
What changes if a “ticket” instead refunds a payment?

**Expected:** server authorization, accurate consequential annotations, explicit user confirmation, durable idempotency, transaction boundaries, audit logs, cancellation semantics and error recovery. Tool registration alone grants none of these protections.
