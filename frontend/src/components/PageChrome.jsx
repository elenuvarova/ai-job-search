// Shared page-level a11y chrome: per-route <title>, skip link, and the <main>
// landmark — so every screen is consistent and reachable by keyboard.
import { useEffect } from "react";

const SUFFIX = "Benelux AI Job Scout";

// Set document.title for the route, e.g. usePageTitle("Jobs").
export function usePageTitle(label) {
  useEffect(() => {
    document.title = label ? `${label} · ${SUFFIX}` : SUFFIX;
  }, [label]);
}

// Visually-hidden "skip to main content" link — first focusable element.
export function SkipLink() {
  return (
    <a className="skip-link" href="#main">
      Skip to main content
    </a>
  );
}

// The page's <main> landmark. Wraps the existing .page shell.
export function Main({ className = "page", children, ...rest }) {
  return (
    <main id="main" className={className} {...rest}>
      {children}
    </main>
  );
}
