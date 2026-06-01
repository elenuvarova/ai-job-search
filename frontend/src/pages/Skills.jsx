import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";

const COUNTRIES = [
  { value: "", label: "All countries" },
  { value: "BE", label: "🇧🇪 Belgium" },
  { value: "NL", label: "🇳🇱 Netherlands" },
];

export default function Skills() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const country = searchParams.get("country") || "";

  useEffect(() => {
    setLoading(true);
    const params = country ? `?country=${country}` : "";
    fetch(`/api/analytics/skills${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [country]);

  const maxCount = data?.skills?.[0]?.count || 1;

  return (
    <div>
      <Navbar />
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Skill Gap Radar</h1>
          <span className="feed-stats">
            {data && (
              <>
                Top skills across{" "}
                <strong>{data.total_jobs}</strong> jobs
                {country && ` · ${country}`}
              </>
            )}
          </span>
        </div>

        <div className="filters" style={{ marginBottom: "var(--space-5)" }}>
          <div className="filter-group">
            <label className="filter-label" htmlFor="s-country">Country</label>
            <select
              id="s-country"
              value={country}
              onChange={(e) => {
                const next = new URLSearchParams();
                if (e.target.value) next.set("country", e.target.value);
                setSearchParams(next, { replace: true });
              }}
            >
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && <div className="status-msg">Loading…</div>}

        {!loading && data?.skills?.length === 0 && (
          <div className="status-msg">No skill data for these filters.</div>
        )}

        {data?.skills && (
          <div className="skill-radar">
            {data.skills.map((s) => (
              <div key={s.skill} className="skill-radar-row">
                <span className="skill-radar-name">{s.skill}</span>
                <div className="skill-radar-bar-track">
                  <div
                    className="skill-radar-bar-fill"
                    style={{ width: `${(s.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="skill-radar-stat">
                  {s.count} <span className="skill-radar-pct">({s.pct}%)</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {data && (
          <p className="feed-stats" style={{ marginTop: "var(--space-5)" }}>
            Skill percentages = share of indexed jobs mentioning the skill.
          </p>
        )}
      </div>
    </div>
  );
}
