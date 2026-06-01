const CONFIG = {
  good:    { icon: "✓", label: "English OK",      tip: "English only — no local language required" },
  maybe:   { icon: "~", label: "Lang: Maybe",      tip: "Dutch/French/German preferred but not required" },
  risk:    { icon: "!",  label: "Lang: Risk",       tip: "Local language likely required — check posting" },
  blocker: { icon: "✗", label: "Lang: Blocker",    tip: "Dutch/French/German/Luxembourgish is required" },
  unknown: { icon: "?", label: "Lang: ?",           tip: "Language requirement could not be determined" },
};

export default function LanguageBadge({ match, large = false }) {
  const key = match || "unknown";
  const { icon, label, tip } = CONFIG[key] || CONFIG.unknown;
  return (
    <span className={`lang-badge ${key}`} title={tip} aria-label={tip}>
      {icon} {large ? label : label}
    </span>
  );
}
