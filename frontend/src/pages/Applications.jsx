import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import LanguageBadge from "../components/LanguageBadge.jsx";

const STATUSES = ["saved", "need_cv", "applied", "interview", "offer", "rejected", "archived"];

const STATUS_CONFIG = {
  saved:     { label: "Saved",      cls: "status-saved" },
  need_cv:   { label: "Need CV",    cls: "status-need-cv" },
  applied:   { label: "Applied",    cls: "status-applied" },
  interview: { label: "Interview",  cls: "status-interview" },
  offer:     { label: "Offer 🎉",   cls: "status-offer" },
  rejected:  { label: "Rejected",   cls: "status-rejected" },
  archived:  { label: "Archived",   cls: "status-archived" },
};

const COUNTRY_FLAGS = { BE: "🇧🇪", NL: "🇳🇱", LU: "🇱🇺" };

function relativeTime(iso) {
  if (!iso) return "—";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function ApplicationRow({ app, onStatusChange, onDelete }) {
  const job = app.Job;
  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.saved;

  return (
    <div className="app-row">
      <div className="app-row-main">
        <Link to={`/jobs/${job.id}`} className="app-job-title">
          {job.title}
        </Link>
        <span className="app-job-meta">
          {job.company}
          {job.location_raw && (
            <> · {COUNTRY_FLAGS[job.country] || ""} {job.location_raw}</>
          )}
        </span>
        {job.JobClassification && (
          <div className="app-chips">
            {job.JobClassification.role_family &&
              job.JobClassification.role_family !== "Other / Unclear" && (
                <span className="chip">{job.JobClassification.role_family}</span>
              )}
            <LanguageBadge match={job.JobClassification.language_match} />
          </div>
        )}
      </div>

      <div className="app-row-actions">
        <select
          className={`status-select ${cfg.cls}`}
          value={app.status}
          onChange={(e) => onStatusChange(app.id, e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <span className="app-date">{relativeTime(app.updated_at)}</span>
        <button className="app-delete-btn" onClick={() => onDelete(app.id)} title="Remove">
          ✕
        </button>
      </div>
    </div>
  );
}

export default function Applications() {
  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");

  const load = () => {
    setLoading(true);
    fetch("/api/applications")
      .then((r) => r.json())
      .then(setApps)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function handleStatusChange(id, status) {
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  }

  async function handleDelete(id) {
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
    setApps((prev) => prev.filter((a) => a.id !== id));
  }

  const filtered = filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = apps.filter((a) => a.status === s).length;
    return acc;
  }, {});

  return (
    <div>
      <Navbar />
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Application Tracker</h1>
          <span className="feed-stats">
            <strong>{apps.length}</strong> saved
          </span>
        </div>

        {/* Status filter tabs */}
        <div className="status-tabs">
          <button
            className={`status-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All <span className="tab-count">{apps.length}</span>
          </button>
          {STATUSES.filter((s) => counts[s] > 0 || filter === s).map((s) => (
            <button
              key={s}
              className={`status-tab ${filter === s ? "active" : ""}`}
              onClick={() => setFilter(s)}
            >
              {STATUS_CONFIG[s].label}
              {counts[s] > 0 && <span className="tab-count">{counts[s]}</span>}
            </button>
          ))}
        </div>

        {loading && <div className="status-msg">Loading…</div>}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">
              {apps.length === 0
                ? "No saved applications yet"
                : "No applications with this status"}
            </div>
            {apps.length === 0 && (
              <Link to="/jobs" className="empty-clear">Browse jobs →</Link>
            )}
          </div>
        )}

        <div className="app-list">
          {filtered.map((app) => (
            <ApplicationRow
              key={app.id}
              app={app}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
