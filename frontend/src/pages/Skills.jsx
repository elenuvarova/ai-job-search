import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { SkeletonFeed, ErrorState, EmptyState } from "../components/States.jsx";

const COUNTRIES = [
  { value: "", label: "All countries" },
  { value: "BE", label: "🇧🇪 Belgium" },
  { value: "NL", label: "🇳🇱 Netherlands" },
];

const W = 720;
const H = 460;

// Interactive force-directed skill graph: drag any bubble to fling it; the rest
// react and the layout settles. Bubble size ∝ how many jobs mention the skill.
function SkillGraph({ skills }) {
  const nodesRef = useRef([]);
  const dragRef = useRef(null);   // { id } currently dragged
  const svgRef = useRef(null);
  const rafRef = useRef(null);
  const runningRef = useRef(false);
  const [, render] = useState(0);

  const maxCount = skills[0]?.count || 1;
  const maxPct = Math.max(...skills.map((s) => s.pct), 1);

  const startLoop = () => {
    if (runningRef.current) return;
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(tick);
  };

  function tick() {
    const nodes = nodesRef.current;
    const cx = W / 2, cy = H / 2;
    const dragId = dragRef.current?.id;

    for (const n of nodes) {
      if (n.id === dragId) continue;
      n.vx += (cx - n.x) * 0.0016; // gentle centering
      n.vy += (cy - n.y) * 0.0016;
    }
    // pairwise collision + mild charge repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const min = a.r + b.r + 6;
        if (d < min) {
          const push = ((min - d) / d) * 0.5;
          if (a.id !== dragId) { a.x -= dx * push; a.y -= dy * push; }
          if (b.id !== dragId) { b.x += dx * push; b.y += dy * push; }
        } else {
          const f = 80 / (d * d);
          if (a.id !== dragId) { a.vx -= (dx / d) * f; a.vy -= (dy / d) * f; }
          if (b.id !== dragId) { b.vx += (dx / d) * f; b.vy += (dy / d) * f; }
        }
      }
    }
    let energy = 0;
    for (const n of nodes) {
      if (n.id === dragId) continue;
      n.vx *= 0.85; n.vy *= 0.85;
      n.x = Math.max(n.r, Math.min(W - n.r, n.x + n.vx));
      n.y = Math.max(n.r, Math.min(H - n.r, n.y + n.vy));
      energy += n.vx * n.vx + n.vy * n.vy;
    }

    render((t) => (t + 1) % 1e6);
    if (dragId || energy > 0.05) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      runningRef.current = false; // settled — stop until the next interaction
    }
  }

  // (Re)seed nodes when the skill set changes.
  useEffect(() => {
    nodesRef.current = skills.map((s, i) => {
      const angle = (i / skills.length) * Math.PI * 2;
      return {
        id: s.skill, count: s.count, pct: s.pct,
        r: 18 + (s.count / maxCount) * 34,
        x: W / 2 + Math.cos(angle) * 130 + (Math.random() - 0.5) * 24,
        y: H / 2 + Math.sin(angle) * 110 + (Math.random() - 0.5) * 24,
        vx: 0, vy: 0,
      };
    });
    startLoop();
    return () => { runningRef.current = false; cancelAnimationFrame(rafRef.current); };
  }, [skills]); // eslint-disable-line react-hooks/exhaustive-deps

  const toSvg = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };
  const onPointerDown = (id) => (e) => {
    e.target.setPointerCapture?.(e.pointerId);
    dragRef.current = { id };
    startLoop();
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const p = toSvg(e);
    const n = nodesRef.current.find((nn) => nn.id === dragRef.current.id);
    if (n) { n.x = p.x; n.y = p.y; n.vx = 0; n.vy = 0; }
  };
  const endDrag = () => { dragRef.current = null; startLoop(); };

  return (
    <svg
      ref={svgRef}
      className="skill-graph"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Interactive skill-frequency graph — drag the bubbles"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      {nodesRef.current.map((n) => (
        <g
          key={n.id}
          className="skill-node"
          transform={`translate(${n.x},${n.y})`}
          onPointerDown={onPointerDown(n.id)}
        >
          <circle
            className="skill-node-circle"
            r={n.r}
            style={{ fillOpacity: 0.5 + (n.pct / maxPct) * 0.45 }}
          />
          {n.r > 24 && (
            <text className="skill-node-label" dy="0.35em">
              {n.id.length > 11 ? n.id.slice(0, 10) + "…" : n.id}
            </text>
          )}
          <title>{n.id} — {n.pct}% of jobs ({n.count})</title>
        </g>
      ))}
    </svg>
  );
}

export default function Skills() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const country = searchParams.get("country") || "";

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = country ? `?country=${country}` : "";
    fetch(`/api/analytics/skills${params}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [country, reloadKey]);

  return (
    <div>
      <Navbar />
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Skill Gap Radar</h1>
          {data && (
            <span className="feed-stats">
              Top skills across <strong>{data.total_jobs}</strong> jobs
              {country && ` · ${country}`}
            </span>
          )}
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

        {loading && <SkeletonFeed rows={4} />}
        {!loading && error && (
          <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        )}
        {!loading && !error && data?.skills?.length === 0 && (
          <EmptyState icon="📊" title="No skill data for these filters" />
        )}

        {!loading && !error && data?.skills?.length > 0 && (
          <>
            <p className="skill-graph-hint">Bubble size = how often a skill appears. Drag any bubble to explore.</p>
            <SkillGraph skills={data.skills} />
            <p className="feed-stats" style={{ marginTop: "var(--space-4)" }}>
              Percentages = share of indexed jobs mentioning the skill.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
