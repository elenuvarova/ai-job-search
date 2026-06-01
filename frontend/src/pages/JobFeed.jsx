import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import LanguageBadge from "../components/LanguageBadge.jsx";
import SourceCredit from "../components/SourceCredit.jsx";
import Tour, { shouldShowTour } from "../components/Tour.jsx";

const COUNTRY_FLAGS = {
  BE: "🇧🇪", NL: "🇳🇱", LU: "🇱🇺",
  GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", ES: "🇪🇸", IT: "🇮🇹", AT: "🇦🇹", PL: "🇵🇱",
};

function relativeTime(iso) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7)  return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function CvScoreBadge({ score }) {
  if (!score || score < 10) return null;
  const level = score >= 25 ? "high" : "mid";
  return <span className={`cv-score-badge ${level}`}>{score}% match</span>;
}

function JobCard({ job, isFirst, cvScore }) {
  const c = job.JobClassification;
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="job-card"
      data-tour={isFirst ? "first-card" : undefined}
    >
      <div className="job-card-top">
        <div className="job-title">{job.title}</div>
        <div className="job-card-badges">
          <CvScoreBadge score={cvScore} />
          <span data-tour={isFirst ? "lang-badge" : undefined}>
            <LanguageBadge match={c?.language_match} />
          </span>
        </div>
      </div>

      <div className="job-meta">
        {job.company && <span>{job.company}</span>}
        {job.location_raw && (
          <span>{COUNTRY_FLAGS[job.country] || ""} {job.location_raw}</span>
        )}
      </div>

      <div className="job-chips">
        {c?.role_family && c.role_family !== "Other / Unclear" && (
          <span className="chip">{c.role_family}</span>
        )}
        {c?.seniority && c.seniority !== "unknown" && (
          <span className="chip">{c.seniority}</span>
        )}
        {c?.employment_type && c.employment_type !== "unclear" && (
          <span className="chip">{c.employment_type.replace("_", "-")}</span>
        )}
        {c?.remote_type && c.remote_type !== "unknown" && (
          <span className="chip">{c.remote_type}</span>
        )}
        {c?.job_post_language && c.job_post_language !== "english" && (
          <span className="chip chip--warn">posted in {c.job_post_language}</span>
        )}
      </div>

      <div className="job-footer">
        <span>{relativeTime(job.posted_at)}</span>
        <SourceCredit source={job.Source} />
      </div>
    </Link>
  );
}

export default function JobFeed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [hasCv, setHasCv]     = useState(null); // null=unknown, false=none, true=yes
  const [scores, setScores]   = useState({});

  const q          = searchParams.get("q")              || "";
  const country    = searchParams.get("country")        || "";
  const langMatch  = searchParams.get("language_match") || "";
  const employment = searchParams.get("employment_type")|| "";
  const remote     = searchParams.get("remote_type")    || "";
  const page       = parseInt(searchParams.get("page")  || "1");
  const sort       = searchParams.get("sort") === "match" ? "match" : "";
  const strongOnly = searchParams.get("min_match") === "25";
  const smart      = searchParams.get("smart") === "1";

  const hasFilters = q || country || langMatch || employment || remote;

  const update = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const clearAll = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Switch sort mode; leaving "match" also drops the strong-only filter.
  const setSort = useCallback(
    (value) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set("sort", value);
      else next.delete("sort");
      if (value !== "match") next.delete("min_match");
      next.delete("page");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    let active = true; // guard against a stale (aborted) response landing late
    setLoading(true);
    setError(null);

    const onError = (e) => { if (active && e.name !== "AbortError") setError(e.message); };
    const onDone  = () => { if (active) setLoading(false); };

    // Semantic mode: rank by meaning over embeddings (ignores filters/pagination).
    if (smart && q.trim().length >= 3) {
      fetch("/api/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
        signal: ctrl.signal,
      })
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((data) => {
          if (active) setResult({
            jobs: data.jobs || [],
            total: (data.jobs || []).length,
            pages: 1,
            semantic: true,
            note: data.note,
          });
        })
        .catch(onError)
        .finally(onDone);
      return () => { active = false; ctrl.abort(); };
    }

    const params = new URLSearchParams();
    if (country)    params.set("country", country);
    if (langMatch)  params.set("language_match", langMatch);
    if (employment) params.set("employment_type", employment);
    if (remote)     params.set("remote_type", remote);
    if (q)          params.set("q", q);
    if (sort === "match") {
      params.set("sort", "match");
      if (strongOnly) params.set("min_match", "25");
    }
    params.set("page", page);
    params.set("limit", "25");

    fetch(`/api/jobs?${params}`, { signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => { if (active) setResult(data); })
      .catch(onError)
      .finally(onDone);
    return () => { active = false; ctrl.abort(); };
  }, [country, langMatch, employment, remote, q, page, sort, strongOnly, smart]);

  // Auto-launch tour for first-time users (after data loads)
  useEffect(() => {
    if (!loading && result && shouldShowTour()) setShowTour(true);
  }, [loading, result]);

  // Check once on mount whether a CV is uploaded
  useEffect(() => {
    fetch("/api/cv")
      .then((r) => r.json())
      .then((cv) => setHasCv(!!cv))
      .catch(() => setHasCv(false));
  }, []);

  // Fetch CV-match scores for the current page of jobs whenever jobs or CV status change.
  // The match sort already returns cv_match in the payload, so skip the extra round-trip there.
  useEffect(() => {
    if (!hasCv || !result?.jobs?.length || result.sort === "match") { setScores({}); return; }
    const ids = result.jobs.map((j) => j.id).join(",");
    fetch(`/api/cv/scores?job_ids=${ids}`)
      .then((r) => r.json())
      .then((data) => setScores(data.scores || {}))
      .catch(() => setScores({}));
  }, [hasCv, result]);

  return (
    <div>
      <Navbar
        sub="ML · Data Science · AI Engineering"
        onHelpClick={() => setShowTour(true)}
      />

      <div className="page">
        {/* Filter bar */}
        <div className="filters" data-tour="filters">
          <div className="filter-group search-group">
            <label className="filter-label" htmlFor="f-q">Search</label>
            <div className="search-input-wrap">
              <input
                id="f-q"
                type="text"
                placeholder={smart ? "Describe what you want…" : "Job title…"}
                value={q}
                onChange={(e) => update("q", e.target.value)}
              />
              <button
                type="button"
                className={`smart-toggle ${smart ? "is-active" : ""}`}
                onClick={() => update("smart", smart ? "" : "1")}
                title="Semantic search — rank by meaning, not keywords"
                aria-pressed={smart}
              >
                ✨ Smart
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="f-country">Country</label>
            <select id="f-country" value={country} onChange={(e) => update("country", e.target.value)}>
              <option value="">All</option>
              <optgroup label="Benelux">
                <option value="BE">🇧🇪 Belgium</option>
                <option value="NL">🇳🇱 Netherlands</option>
                <option value="LU">🇱🇺 Luxembourg</option>
              </optgroup>
              <optgroup label="EU / UK · remote & contract">
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="DE">🇩🇪 Germany</option>
                <option value="FR">🇫🇷 France</option>
                <option value="ES">🇪🇸 Spain</option>
                <option value="IT">🇮🇹 Italy</option>
                <option value="AT">🇦🇹 Austria</option>
                <option value="PL">🇵🇱 Poland</option>
              </optgroup>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="f-lang">Language</label>
            <select id="f-lang" value={langMatch} onChange={(e) => update("language_match", e.target.value)}>
              <option value="">All</option>
              <option value="good">✓ English OK</option>
              <option value="maybe">~ Maybe (preferred)</option>
              <option value="risk">! Risk (likely required)</option>
              <option value="blocker">✗ Blocker (required)</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="f-emp">Employment</label>
            <select id="f-emp" value={employment} onChange={(e) => update("employment_type", e.target.value)}>
              <option value="">All</option>
              <option value="full_time">Full-time</option>
              <option value="contract">Contract / Freelance</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="f-remote">Remote</label>
            <select id="f-remote" value={remote} onChange={(e) => update("remote_type", e.target.value)}>
              <option value="">All</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>

          {hasFilters && (
            <button className="filter-clear" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>

        {/* Language legend */}
        <div className="lang-legend">
          <span>Language:</span>
          {[
            { key: "good",    icon: "✓", tip: "English only" },
            { key: "maybe",   icon: "~", tip: "Optional local language" },
            { key: "risk",    icon: "!", tip:  "Likely required" },
            { key: "blocker", icon: "✗", tip: "Hard requirement" },
          ].map(({ key, icon, tip }) => (
            <span key={key} className="lang-legend-item">
              <span className={`lang-badge ${key}`}>{icon}</span>
              <span>{tip}</span>
            </span>
          ))}
        </div>

        {/* Sort */}
        {hasCv && !smart && (
          <div className="sort-bar">
            <span className="sort-bar-label">Sort</span>
            <button
              className={`sort-pill ${sort !== "match" ? "is-active" : ""}`}
              onClick={() => setSort("")}
              aria-pressed={sort !== "match"}
            >
              Newest
            </button>
            <button
              className={`sort-pill ${sort === "match" ? "is-active" : ""}`}
              onClick={() => setSort("match")}
              aria-pressed={sort === "match"}
            >
              ★ Best match
            </button>
            {sort === "match" && (
              <label className="sort-strong">
                <input
                  type="checkbox"
                  checked={strongOnly}
                  onChange={(e) => update("min_match", e.target.checked ? "25" : "")}
                />
                Strong only
              </label>
            )}
          </div>
        )}

        {/* Stats */}
        {result && (
          <div className="feed-stats">
            <strong>{result.total}</strong> jobs
            {langMatch === "good" && " · English-friendly"}
            {country && ` · ${country}`}
            {result.sort === "match" &&
              (result.capped ? " · ranked the 600 most recent by CV match" : " · sorted by CV match")}
            {result.semantic && " · ✨ semantic"}
            {result.pages > 1 && ` · page ${page} of ${result.pages}`}
          </div>
        )}

        {result?.semantic && result?.note && (
          <div className="status-msg">{result.note}</div>
        )}

        {loading && <div className="status-msg">Loading…</div>}
        {error   && <div className="error-msg">Error: {error}</div>}

        {!loading && !error && result?.jobs?.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">No jobs match these filters</div>
            {hasFilters && (
              <button className="empty-clear" onClick={clearAll}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        {result?.jobs?.map((job, i) => (
          <JobCard key={job.id} job={job} isFirst={i === 0} cvScore={job.cv_match ?? scores[job.id]} />
        ))}

        {result && result.pages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => update("page", String(page - 1))}>
              ← Prev
            </button>
            <span className="pagination-info">{page} / {result.pages}</span>
            <button disabled={page >= result.pages} onClick={() => update("page", String(page + 1))}>
              Next →
            </button>
          </div>
        )}
      </div>

      {showTour && <Tour onDone={() => setShowTour(false)} />}
    </div>
  );
}
