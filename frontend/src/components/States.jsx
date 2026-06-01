// Shared loading / error / empty UI so every screen is consistent.

export function Spinner({ label }) {
  return (
    <span className="spinner-wrap">
      <span className="spinner" aria-hidden="true" />
      {label && <span className="spinner-label">{label}</span>}
    </span>
  );
}

export function SkeletonFeed({ rows = 6 }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton" style={{ width: "55%", height: 16, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: "35%", height: 12, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: "70%", height: 12 }} />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="state" role="alert">
      <div className="state-icon">⚠️</div>
      <div className="state-title">{title}</div>
      {message && <div className="state-msg">{message}</div>}
      {onRetry && (
        <button className="state-action" onClick={onRetry}>Try again</button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "🔍", title, message, action }) {
  return (
    <div className="state">
      <div className="state-icon" aria-hidden="true">{icon}</div>
      <div className="state-title">{title}</div>
      {message && <div className="state-msg">{message}</div>}
      {action}
    </div>
  );
}
