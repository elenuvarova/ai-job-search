import { Link } from "react-router-dom";
import { useTheme } from "../hooks/useTheme.js";

export default function Navbar({ sub, onHelpClick }) {
  const { theme, toggle } = useTheme();

  return (
    <nav className="navbar">
      <Link to="/jobs" className="navbar-brand">
        Benelux AI Job Scout
      </Link>
      {sub && <span className="navbar-sub">{sub}</span>}
      <div className="navbar-actions">
        {onHelpClick && (
          <button className="help-btn" onClick={onHelpClick} title="Show tour">
            ? Tour
          </button>
        )}
        <button
          className="theme-btn"
          onClick={toggle}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
    </nav>
  );
}
