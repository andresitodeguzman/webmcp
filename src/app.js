import { createTicketStore } from './domain.js';
import { makeTicketTool, registerTicketTool } from './tools.js';

const $ = id => document.getElementById(id);
const store = createTicketStore();

function render() {
  const tickets = store.list();
  $('count').textContent = tickets.length;
  const rows = tickets.length ? tickets.map(ticket => {
    const li = document.createElement('li');
    // User input is text, never HTML.
    li.textContent = `${ticket.id} · ${ticket.category} · ${ticket.summary}`;
    return li;
  }) : [Object.assign(document.createElement('li'), { textContent: 'No tickets yet.' })];
  $('tickets').replaceChildren(...rows);
}

// This shared action updates the same visible state for both entry points.
function submit(input) {
  const result = store.submit(input);
  render();
  $('feedback').textContent = `${result.duplicate ? 'Already received' : 'Received'}: ${result.ticket.id}`;
  return result;
}

$('ticket-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    submit({ summary: $('summary').value, category: $('category').value });
  } catch (error) {
    $('feedback').textContent = error.message;
  }
});

$('preview').addEventListener('click', () => {
  $('feedback').textContent = `Preview only: ${$('summary').value}. Nothing submitted.`;
});

$('reset').addEventListener('click', () => {
  store.reset();
  render();
  $('feedback').textContent = 'Demo reset. No tickets submitted.';
  $('result').textContent = 'The tool result will appear here.';
});

const tool = makeTicketTool(submit);
const { execute, ...contract } = tool;
$('contract').textContent = JSON.stringify(contract, null, 2);

let registration;
let nativeCallable = false;
try {
  registration = await registerTicketTool(document.modelContext, tool);
  nativeCallable = registration.native &&
    typeof document.modelContext.getTools === 'function' &&
    typeof document.modelContext.executeTool === 'function';
  $('status').textContent = registration.native
    ? 'Native WebMCP tool registered ✓'
    : 'Rehearsal mode · native WebMCP is unavailable in this browser';
} catch (error) {
  $('status').textContent = `Native registration failed: ${error.message}. Rehearsal mode is available.`;
}

$('mode-copy').textContent = nativeCallable
  ? 'This panel discovers and invokes the real browser tool API. It is a deterministic caller, not an AI agent.'
  : 'Rehearsal only: calls the same JavaScript handler directly. It does not test browser-mediated WebMCP discovery or execution.';
$('run').textContent = nativeCallable ? 'Call native WebMCP tool' : 'Run rehearsal handler';
$('run').disabled = false;

$('run').addEventListener('click', async () => {
  $('run').disabled = true;
  try {
    const args = JSON.parse($('arguments').value);
    let result;
    if (nativeCallable) {
      const registered = (await document.modelContext.getTools())
        .find(candidate => candidate.name === tool.name);
      if (!registered) {
        throw new Error('Tool is no longer registered. Reload to register it.');
      }
      result = await document.modelContext.executeTool(registered, args);
    } else {
      result = await tool.execute(args);
    }
    $('result').textContent = typeof result === 'string'
      ? result : JSON.stringify(result, null, 2);
  } catch (error) {
    $('result').textContent = `Error: ${error.message}`;
  } finally {
    $('run').disabled = false;
  }
});

// Page destruction removes the context. Keep registration for bfcache restores.
window.addEventListener('pagehide', event => {
  if (!event.persisted) registration?.dispose();
});
