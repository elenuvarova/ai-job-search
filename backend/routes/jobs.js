import { Router } from "express";
import { Op } from "sequelize";
import { sequelize } from "../db.js";
import { Job, Source, JobClassification, JobSkill } from "../models/index.js";
import { getActiveCvTerms, scoreJobText } from "../rag/cvMatch.js";
import { embed } from "../rag/embed.js";
import { rankByEmbedding } from "../rag/jobSearch.js";

const router = Router();

// Newest-first, but jobs without a posted_at go LAST (not first). Plain
// `posted_at DESC` puts NULLs first on Postgres, which would float undated jobs
// (HN, some boards) to the top. `posted_at IS NULL ASC` keeps dated jobs first.
// Works on both Postgres and SQLite without the NULLS LAST keyword.
const RECENCY_ORDER = [[sequelize.literal("posted_at IS NULL"), "ASC"], ["posted_at", "DESC"]];

// Attributes returned for each classification, shared by both sort paths.
const CLASS_ATTRS = [
  "role_family", "seniority", "employment_type", "remote_type",
  "job_post_language", "required_languages", "optional_languages",
  "language_blocker", "language_match",
];

// Cap on how many (most-recent) filtered jobs get scored for the match sort —
// keeps the in-memory scoring bounded; older jobs are rarely the top match anyway.
const MAX_SCORED = 600;

// GET /api/jobs
// Filters: country, source, q (title search), language_match, employment_type,
//          remote_type, role_family, seniority, blocker (bool)
// Pagination: page (1-based), limit (default 50, max 100)
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const jobWhere = {};
    if (req.query.country) jobWhere.country = req.query.country.toUpperCase();
    if (req.query.q) jobWhere.title = { [Op.like]: `%${req.query.q}%` };

    const sourceWhere = {};
    if (req.query.source) sourceWhere.key = req.query.source;

    const classWhere = {};
    if (req.query.language_match) classWhere.language_match = req.query.language_match;
    if (req.query.employment_type) classWhere.employment_type = req.query.employment_type;
    if (req.query.remote_type) classWhere.remote_type = req.query.remote_type;
    if (req.query.role_family) classWhere.role_family = req.query.role_family;
    if (req.query.seniority) classWhere.seniority = req.query.seniority;
    if (req.query.blocker !== undefined) {
      classWhere.language_blocker = req.query.blocker === "true";
    }

    const hasClassFilter = Object.keys(classWhere).length > 0;

    const sourceInclude = (attrs) => ({ model: Source, where: sourceWhere, attributes: attrs });
    const classInclude = (attrs) => ({
      model: JobClassification,
      required: hasClassFilter,
      where: hasClassFilter ? classWhere : undefined,
      attributes: attrs,
    });

    // ── Match sort: score the most-recent filtered jobs against the active CV,
    // order by score, paginate in memory. Falls back to newest if no CV. ──
    const wantMatch = req.query.sort === "match";
    const minMatch = Math.max(0, parseInt(req.query.min_match) || 0);
    const cvTerms = wantMatch ? await getActiveCvTerms() : null;

    if (wantMatch && cvTerms) {
      const candidates = await Job.findAll({
        where: jobWhere,
        include: [sourceInclude([]), classInclude([])],
        attributes: ["id", "title", "description", "posted_at"],
        order: RECENCY_ORDER,
        limit: MAX_SCORED,
        subQuery: false,
      });

      let scored = candidates.map((j) => ({
        id: j.id,
        score: scoreJobText(cvTerms, `${j.title || ""} ${(j.description || "").slice(0, 3000)}`),
        posted_at: j.posted_at,
      }));
      if (minMatch > 0) scored = scored.filter((s) => s.score >= minMatch);
      scored.sort(
        (a, b) =>
          b.score - a.score ||
          new Date(b.posted_at || 0) - new Date(a.posted_at || 0)
      );

      const total = scored.length;
      const pageSlice = scored.slice(offset, offset + limit);
      const ids = pageSlice.map((s) => s.id);

      const rows = ids.length
        ? await Job.findAll({
            where: { id: ids },
            include: [
              { model: Source, attributes: ["key", "label", "attribution_html"] },
              { model: JobClassification, attributes: CLASS_ATTRS },
            ],
          })
        : [];

      const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
      const scoreById = Object.fromEntries(pageSlice.map((s) => [s.id, s.score]));
      const jobs = ids
        .filter((id) => byId[id])
        .map((id) => {
          const j = byId[id].toJSON();
          j.cv_match = scoreById[id];
          return j;
        });

      return res.json({
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        jobs,
        sort: "match",
        // total counts only the scored window; flag when the cap was hit so the
        // UI can say "ranked the most recent N" rather than implying it ranked all.
        capped: candidates.length >= MAX_SCORED,
      });
    }

    // ── Default sorts (CV-independent), whitelisted server-side so user input
    // never reaches the order clause directly. ──
    const SORT_ORDERS = {
      newest: RECENCY_ORDER,
      oldest: [[sequelize.literal("posted_at IS NULL"), "ASC"], ["posted_at", "ASC"]],
      company: [[sequelize.literal("company IS NULL OR company = ''"), "ASC"], ["company", "ASC"]],
      title: [["title", "ASC"]],
    };
    const sortKey = SORT_ORDERS[req.query.sort] ? req.query.sort : "newest";

    const { count, rows } = await Job.findAndCountAll({
      where: jobWhere,
      include: [
        sourceInclude(["key", "label", "attribution_html"]),
        classInclude(CLASS_ATTRS),
      ],
      order: SORT_ORDERS[sortKey],
      limit,
      offset,
      distinct: true,
    });

    res.json({
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
      jobs: rows,
      sort: sortKey,
    });
  } catch (err) {
    console.error("[jobs] list failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

// GET /api/jobs/:id/similar — nearest jobs by embedding cosine.
router.get("/:id/similar", async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      attributes: ["id", "title", "description", "embedding"],
    });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const vec = Array.isArray(job.embedding)
      ? job.embedding
      : await embed(`${job.title || ""}\n${(job.description || "").slice(0, 2000)}`);

    const ranked = await rankByEmbedding(vec, { excludeId: job.id, limit: 8 });
    const ids = ranked.map((r) => r.id);
    if (!ids.length) return res.json({ jobs: [] });

    const rows = await Job.findAll({
      where: { id: ids },
      attributes: ["id", "title", "company", "country", "location_raw"],
      include: [{ model: JobClassification, attributes: ["role_family", "language_match"] }],
    });
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    res.json({ jobs: ids.map((id) => byId[id]).filter(Boolean) });
  } catch (err) {
    console.error("[jobs] similar failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

// GET /api/jobs/:id — full detail with skills
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [
        { model: Source, attributes: ["key", "label", "attribution_html"] },
        { model: JobClassification, required: false },
        { model: JobSkill, required: false },
      ],
    });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err) {
    console.error("[jobs] detail failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

export default router;
