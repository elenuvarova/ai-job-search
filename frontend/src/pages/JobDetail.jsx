import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import LanguageBadge from "../components/LanguageBadge.jsx";
import SourceCredit from "../components/SourceCredit.jsx";

const COUNTRY_FLAGS = { BE: "🇧🇪", NL: "🇳🇱", LU: "🇱🇺" };

function relativeTime(iso) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7)  return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
  return `${Math.floor(d / 30)} months ago`;
}

function ApplyButton({ url }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="apply-btn">
      Apply →
    </a>
  );
}

const ACTION_LABELS = {
  "tailor-cv":     "✨ Tailor CV",
  "cover-letter":  "✉ Cover Letter",
  "interview-prep":"🎯 Interview Prep",
};

function RagPanel({ jobId }) {
  const [cv, setCv]               = useState(undefined); // undefined = loading, null = none
  const [uploading, setUploading] = useState(false);
  const [action, setAction]       = useState(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState(null);
  const [ragError, setRagError]   = useState(null);
  const [copied, setCopied]       = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    fetch("/api/cv")
      .then((r) => r.json())
      .then(setCv)
      .catch(() => setCv(null));
  }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("cv", file);
    try {
      const r = await fetch("/api/cv/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Upload failed");
      setCv(data);
      setRagResult(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!cv?.id) return;
    await fetch(`/api/cv/${cv.id}`, { method: "DELETE" });
    setCv(null);
    setRagResult(null);
  }

  async function runAction(act) {
    setAction(act);
    setRagLoading(true);
    setRagResult(null);
    setRagError(null);
    try {
      const r = await fetch(`/api/jobs/${jobId}/${act}`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Request failed");
      setRagResult(data.result);
    } catch (err) {
      setRagError(err.message);
    } finally {
      setRagLoading(false);
    }
  }

  function copyResult() {
    if (!ragResult) return;
    navigator.clipboard.writeText(ragResult).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (cv === undefined) return null; // still loading CV status

  return (
    <div className="detail-section">
      <div className="detail-section-title">AI Assistant</div>

      {!cv ? (
        <div className="rag-upload-prompt">
          <p className="rag-upload-hint">
            Upload your CV to enable AI-powered tailoring, cover letters and interview prep.
          </p>
          <label className="rag-upload-btn">
            {uploading ? "Analysing CV…" : "Upload CV (PDF or DOCX)"}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleUpload}
              disabled={uploading}
              hidden
            />
          </label>
        </div>
      ) : (
        <div>
          <div className="rag-cv-bar">
            <span className="rag-cv-name">📄 {cv.label}</span>
            <button className="rag-cv-remove" onClick={handleRemove}>Remove</button>
          </div>

          <div className="rag-actions">
            {Object.entries(ACTION_LABELS).map(([act, label]) => (
              <button
                key={act}
                className={`rag-action-btn ${action === act && ragLoading ? "loading" : ""}`}
                onClick={() => runAction(act)}
                disabled={ragLoading}
              >
                {action === act && ragLoading ? "Generating…" : label}
              </button>
            ))}
          </div>

          {ragError && <div className="error-msg" style={{ marginTop: "var(--space-3)" }}>{ragError}</div>}

          {ragResult && (
            <div className="rag-result">
              <div className="rag-result-header">
                <span>{ACTION_LABELS[action]}</span>
                <button className="rag-copy-btn" onClick={copyResult}>
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <pre className="rag-result-text">{ragResult}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setJob)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <><Navbar /><div className="page" style={{ paddingTop: "2rem" }}><div className="status-msg">Loading…</div></div></>;
  if (error)   return <><Navbar /><div className="page" style={{ paddingTop: "2rem" }}><div className="error-msg">Error: {error}</div></div></>;
  if (!job)    return null;

  const c            = job.JobClassification;
  const skills       = job.JobSkills || [];
  const requiredLangs = c?.required_languages || [];
  const optionalLangs = c?.optional_languages || [];
  const showLangBlock = requiredLangs.length > 0 || optionalLangs.length > 0;

  return (
    <div>
      <Navbar />

      <div className="page">
        <button className="back-btn" onClick={() => navigate("/jobs")}>
          ← Back to jobs
        </button>

        {/* Header */}
        <div className="detail-header">
          <div className="detail-title">{job.title}</div>
          <div className="detail-company">
            {job.company}
            {job.location_raw && (
              <> · {COUNTRY_FLAGS[job.country] || ""} {job.location_raw}</>
            )}
            {job.posted_at && <> · Posted {relativeTime(job.posted_at)}</>}
          </div>
        </div>

        {/* Badges */}
        <div className="detail-badges">
          <LanguageBadge match={c?.language_match} large />
          {c?.employment_type && c.employment_type !== "unclear" && (
            <span className="chip">{c.employment_type.replace("_", "-")}</span>
          )}
          {c?.remote_type && c.remote_type !== "unknown" && (
            <span className="chip">{c.remote_type}</span>
          )}
          {c?.role_family && c.role_family !== "Other / Unclear" && (
            <span className="chip">{c.role_family}</span>
          )}
          {c?.seniority && c.seniority !== "unknown" && (
            <span className="chip">{c.seniority}</span>
          )}
          {c?.job_post_language && (
            <span className="chip chip--warn">posted in {c.job_post_language}</span>
          )}
        </div>

        {/* Apply CTA — above description so it's always in view */}
        <div className="detail-cta">
          <ApplyButton url={job.apply_url} />
          <SourceCredit source={job.Source} />
        </div>

        {/* Language requirements */}
        {showLangBlock && (
          <div className="detail-section">
            <div className="detail-section-title">Language requirements</div>
            <div className="lang-list">
              {requiredLangs.map((l) => (
                <div key={l} className="lang-item required">✗ Required: {l}</div>
              ))}
              {optionalLangs.map((l) => (
                <div key={l} className="lang-item optional">~ Preferred: {l}</div>
              ))}
            </div>
          </div>
        )}
        {!showLangBlock && c && (
          <div className="detail-section">
            <div className="detail-section-title">Language requirements</div>
            <div className="lang-list">
              <div className="lang-item ok">✓ English only — no local language required</div>
            </div>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">Detected skills</div>
            <div className="skills-grid">
              {skills.map((s) => (
                <span key={s.skill} className="skill-chip">{s.skill}</span>
              ))}
            </div>
          </div>
        )}

        {/* Description — expandable */}
        {job.description && (
          <div className="detail-section">
            <div className="detail-section-title">Job description</div>
            <div className={`description-box ${expanded ? "expanded" : ""}`}>
              {job.description}
            </div>
            {!expanded && (
              <button className="expand-btn" onClick={() => setExpanded(true)}>
                Show full description ↓
              </button>
            )}
          </div>
        )}

        {/* RAG Assistant */}
        <RagPanel jobId={id} />

        {/* Bottom apply anchor */}
        {job.apply_url && (
          <div style={{ marginTop: "var(--space-6)" }}>
            <ApplyButton url={job.apply_url} />
          </div>
        )}
      </div>
    </div>
  );
}
