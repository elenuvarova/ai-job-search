import { Router } from "express";
import { Op } from "sequelize";
import { Job, Source, JobClassification, JobSkill } from "../models/index.js";

const router = Router();

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

    const { count, rows } = await Job.findAndCountAll({
      where: jobWhere,
      include: [
        { model: Source, where: sourceWhere, attributes: ["key", "label", "attribution_html"] },
        {
          model: JobClassification,
          required: hasClassFilter,
          where: hasClassFilter ? classWhere : undefined,
          attributes: [
            "role_family", "seniority", "employment_type", "remote_type",
            "job_post_language", "required_languages", "optional_languages",
            "language_blocker", "language_match",
          ],
        },
      ],
      order: [["posted_at", "DESC"]],
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

export default router;
