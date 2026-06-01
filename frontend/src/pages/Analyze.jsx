import { useState } from "react";
import Navbar from "../components/Navbar.jsx";
import LanguageBadge from "../components/LanguageBadge.jsx";

function CvBadge({ score }) {
  if (score == null) return null;
  const level = score >= 25 ? "high" : "mid";
  return <span className={`cv-score-badge ${level}`}>{score}% CV match</span>;
}

export default function Analyze() {
  const [title, setTitle]     = useState("");
  const [text, setText]       = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const c = result?.classification;

  return (
    <div>
      <Navbar />
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Analyze a job</h1>
        </div>
        <p className="analyze-hint">
          Paste any job description — including LinkedIn / Indeed roles we don't collect —
          to classify it and score it against your CV. Nothing is stored.
        </p>

        <div className="analyze-form">
          <input
            className="analyze-title"
            placeholder="Job title (optional — improves accuracy)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="analyze-text"
            placeholder="Paste the full job description here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
          />
          <button
            className="apply-btn"
            onClick={run}
            disabled={loading || text.trim().length < 30}
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        {error && (
          <div className="error-msg" style={{ marginTop: "var(--space-3)" }}>{error}</div>
        )}

        {c && (
          <div className="analyze-result">
            <div className="detail-badges">
              <LanguageBadge match={c.language_match} large />
              {result.cv.has_cv && <CvBadge score={result.cv.cv_match} />}
              {c.role_family && c.role_family !== "Other / Unclear" && (
                <span className="chip">{c.role_family}</span>
              )}
              {c.seniority && c.seniority !== "unknown" && (
                <span className="chip">{c.seniority}</span>
              )}
              {c.employment_type && c.employment_type !== "unclear" && (
                <span className="chip">{c.employment_type.replace("_", "-")}</span>
              )}
              {c.remote_type && c.remote_type !== "unknown" && (
                <span className="chip">{c.remote_type}</span>
              )}
              {c.job_post_language && (
                <span className="chip chip--warn">posted in {c.job_post_language}</span>
              )}
            </div>

            {(c.required_languages?.length > 0 || c.optional_languages?.length > 0) && (
              <div className="detail-section">
                <div className="detail-section-title">Language requirements</div>
                <div className="lang-list">
                  {c.required_languages.map((l) => (
                    <div key={l} className="lang-item required">✗ Required: {l}</div>
                  ))}
                  {c.optional_languages.map((l) => (
                    <div key={l} className="lang-item optional">~ Preferred: {l}</div>
                  ))}
                </div>
              </div>
            )}

            {result.skills.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-title">Detected skills</div>
                <div className="skills-grid">
                  {result.skills.map((s) => {
                    const has = result.cv.has_cv && result.cv.matched.includes(s);
                    const gap = result.cv.has_cv && result.cv.missing.includes(s);
                    return (
                      <span key={s} className={`skill-chip ${has ? "match" : gap ? "gap" : ""}`}>
                        {s}
                      </span>
                    );
                  })}
                </div>
                {result.cv.has_cv && (
                  <p className="analyze-gap-note">Green = already in your CV · amber = a gap to address</p>
                )}
              </div>
            )}

            {!result.cv.has_cv && (
              <p className="analyze-hint">
                Upload a CV (on any job page) to also see your match score and skill gaps here.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
