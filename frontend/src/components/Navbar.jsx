import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../hooks/useTheme.js";

export default function Navbar({ onHelpClick }) {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();

  const navLink = (to, label) => {
    const active = pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`nav-link ${active ? "active" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="navbar" aria-label="Primary">
      <Link to="/jobs" className="navbar-brand">
        Benelux AI Job Scout
      </Link>
      <div className="nav-links">
        {navLink("/jobs", "Jobs")}
        {navLink("/analyze", "Analyze")}
        {navLink("/chat", "Ask")}
        {navLink("/applications", "Tracker")}
        {navLink("/skills", "Skills")}
      </div>
      <div className="navbar-actions">
        {onHelpClick && (
          <button
            id="tour-trigger"
            className="help-btn"
            onClick={onHelpClick}
            title="Show tour"
          >
            ? Tour
          </button>
        )}
        <button
          className="theme-btn"
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
    </nav>
  );
}
