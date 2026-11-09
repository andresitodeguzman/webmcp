import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: {
    default: "WebMCP Learning Lab",
    template: "%s · WebMCP Learning Lab",
  },
  description:
    "Learn how people and browser tools can share the same application actions. Try a mock pantry shop and a help desk.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <nav className="site-nav" aria-label="Examples">
          <Link href="/" className="wordmark">
            WebMCP <span>learning lab</span>
          </Link>
          <div>
            <Link href="/shop">Pantry Run</Link>
            <Link href="/help-desk">Help desk</Link>
            <a href="https://github.com/andresitodeguzman/webmcp">
              Source code ↗
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
