"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createTicketStore } from "../src/domain.js";
import { makeTicketTool } from "../src/tools.js";
import ToolPanel from "./ToolPanel.jsx";

const sample = {
  summary: "Hindi ako maka-sign in sa demo account ko",
  category: "account",
};
const presets = { submit_demo_ticket: sample };

export default function HelpDesk() {
  const storeRef = useRef(null);
  if (!storeRef.current) storeRef.current = createTicketStore();
  const store = storeRef.current;
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(sample.summary);
  const [category, setCategory] = useState(sample.category);
  const [feedback, setFeedback] = useState("No ticket submitted yet.");
  const submitTicket = useCallback(
    (input) => {
      if (!navigator.onLine)
        throw new Error(
          "You’re offline. Reconnect before submitting a demo ticket.",
        );
      // UI and tool execution both enter this action; React renders its snapshot.
      const result = store.submit(input);
      setTickets(store.list());
      setFeedback(
        `${result.duplicate ? "Already received" : "Received"}: ${result.ticket.id}`,
      );
      return result;
    },
    [store],
  );
  const tools = useMemo(() => [makeTicketTool(submitTicket)], [submitTicket]);

  function submit(event) {
    event.preventDefault();
    // The domain validator runs even when HTML validation was bypassed by a tool.
    try {
      submitTicket({ summary, category });
    } catch (error) {
      setFeedback(error.message);
    }
  }

  return (
    <main id="main" className="helpdesk">
      <div className="container">
        <header>
          <p className="eyebrow">COMMUNITY HELP DESK</p>
          <h1>
            Dear AI, that’s not
            <br />
            the submit button.
          </h1>
          <p className="lead">
            One task. Two paths. The same application logic.
          </p>
        </header>
        <section className="help-form">
          <p className="eyebrow">THE HUMAN PATH</p>
          <h2 lang="fil">Patulong sa account</h2>
          <p>
            A demo help desk for an online learning community.{" "}
            <span lang="fil">Walang totoong ticket na ipapadala.</span>
          </p>
          <form id="ticket-form" onSubmit={submit}>
            <label htmlFor="summary">Issue summary</label>
            <input
              id="summary"
              required
              minLength={5}
              maxLength={120}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="account">Account</option>
              <option value="billing">Billing</option>
              <option value="other">Other</option>
            </select>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                id="preview"
                lang="fil"
                onClick={() =>
                  setFeedback(`Preview only: ${summary}. Nothing submitted.`)
                }
              >
                Silip muna
              </button>
              <button type="submit" lang="fil">
                Ipadala ang ticket
              </button>
            </div>
          </form>
          <p id="feedback" aria-live="polite">
            {feedback}
          </p>
        </section>
        <ToolPanel tools={tools} presets={presets} />
        <section className="ledger">
          <div className="section-heading">
            <h2>
              <span lang="fil">Mga demo ticket</span>{" "}
              <span id="count">{tickets.length}</span>
            </h2>
            <button
              className="secondary"
              id="reset"
              onClick={() => {
                store.reset();
                setTickets([]);
                setFeedback("Demo reset. No tickets submitted.");
              }}
            >
              Reset demo
            </button>
          </div>
          <ul id="tickets">
            {tickets.length ? (
              tickets.map((ticket) => (
                <li key={ticket.id}>
                  {ticket.id} · {ticket.category} · {ticket.summary}
                </li>
              ))
            ) : (
              <li>No tickets yet.</li>
            )}
          </ul>
          <p className="fine">
            Synthetic tickets stay in this tab. Reset, refresh, or leaving this
            example clears them. Nothing is sent to a help desk.
          </p>
        </section>
      </div>
    </main>
  );
}
