import { Router } from "express";
import { Job, Source, JobClassification } from "../models/index.js";
import { embed } from "../rag/embed.js";
import { rankByEmbedding } from "../rag/jobSearch.js";

const router = Router();

const CLASS_ATTRS = [
  "role_family", "seniority", "employment_type", "remote_type",
  "job_post_language", "required_languages", "optional_languages",
  "language_blocker", "language_match",
];

// POST /api/search/semantic { q } — natural-language search ranked by meaning.
router.post("/semantic", async (req, res) => {
  try {
    const q = String(req.body.q || "").trim();
    if (q.length < 3) return res.status(400).json({ error: "Enter a search query." });

    const vec = await embed(q);
    const ranked = await rankByEmbedding(vec, { limit: 30 });
    if (!ranked.length) {
      return res.json({ jobs: [], note: "No embedded jobs yet — the embedding backfill runs nightly." });
    }

    const ids = ranked.map((r) => r.id);
    const rows = await Job.findAll({
      where: { id: ids },
      include: [
        { model: Source, attributes: ["key", "label", "attribution_html"] },
        { model: JobClassification, attributes: CLASS_ATTRS },
      ],
    });
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    const jobs = ids.map((id) => byId[id]).filter(Boolean);

    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
