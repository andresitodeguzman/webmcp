import Link from "next/link";

export default function Home() {
  return (
    <main id="main" className="home container">
      <p className="eyebrow">TWO EXAMPLES. THE SAME IDEA.</p>
      <h1>
        A page for people.
        <br />A clear set of actions for tools.
      </h1>
      <p className="lead">
        WebMCP gives compatible browser agents a structured way to use a
        website. Try it here: the buttons and tools share the same application
        logic.
      </p>
      <div className="example-grid">
        <Link className="example-card shopping-card" href="/shop">
          <span className="tag">01 / SHOPPING</span>
          <h2>Pantry Run</h2>
          <p>
            Can rice, coffee, and a little chocolate fit in a ₱500 basket?
            Browse a small Filipino pantry shop, change your cart, and review a
            mock order.
          </p>
          <strong>Build a basket →</strong>
        </Link>
        <Link className="example-card help-card" href="/help-desk">
          <span className="tag">02 / HELP DESK</span>
          <h2>Dear AI, that’s not the submit button.</h2>
          <p>
            Start small. Submit a synthetic community-support ticket through a
            form or a structured tool, then see the same result.
          </p>
          <strong>Try the help desk →</strong>
        </Link>
      </div>
      <aside className="compatibility">
        <h2>Your browser can still join in</h2>
        <p>
          Native WebMCP needs a compatible browser and experimental support.
          Every example also has a labeled rehearsal handler that works without
          it. No account, AI model, payment, or personal information is needed.
        </p>
      </aside>
    </main>
  );
}
