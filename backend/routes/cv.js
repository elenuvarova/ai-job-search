import { Router } from "express";
import { createRequire } from "module";
import multer from "multer";

// pdf-parse and mammoth ship CommonJS — use createRequire in an ESM context
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
import { CvDocument, CvChunk, Job } from "../models/index.js";
import { chunkText } from "../rag/chunk.js";
import { embedBatch } from "../rag/embed.js";
import { scoreJobText, getActiveCvTerms } from "../rag/cvMatch.js";
import { extractSkills } from "../nlp/skills.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    cb(null, ok);
  },
});

async function extractText(buffer, mimetype) {
  if (mimetype === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// GET /api/cv — get current (latest) CV document
router.get("/", async (_req, res) => {
  try {
    const doc = await CvDocument.findOne({ order: [["created_at", "DESC"]] });
    res.json(doc || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cv/upload — upload PDF or DOCX, chunk + embed, store
router.post("/upload", upload.single("cv"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file or unsupported type (PDF/DOCX only)" });

  try {
    const text = await extractText(req.file.buffer, req.file.mimetype);
    const chunks = chunkText(text);

    // Single-user tool (one employee, one CV): replace any previous CV so there's
    // always exactly one active. Chunks cascade-delete with the document.
    await CvDocument.destroy({ where: {} });

    const doc = await CvDocument.create({
      label: req.file.originalname,
      raw_text: text,
      char_count: text.length,
    });

    // Batch-embed all chunks in ONE call (was N sequential calls + 300ms sleeps,
    // which on the free tier ran ~15-25s and dropped the connection → "Failed to
    // fetch"). Non-fatal: if embedding fails, the CV still works for term-overlap
    // match / skill-gap; only RAG retrieval (tailor/cover/prep) degrades.
    let embedded = 0;
    let vectors = [];
    try {
      vectors = await embedBatch(chunks);
    } catch (e) {
      console.error("CV batch embed failed (non-fatal):", e.message);
    }

    const chunkRows = chunks.map((chunk, i) => {
      const embedding = Array.isArray(vectors[i]) ? vectors[i] : null;
      if (embedding) embedded++;
      return { cv_document_id: doc.id, chunk_text: chunk, embedding };
    });
    await CvChunk.bulkCreate(chunkRows);

    res.json({ id: doc.id, label: doc.label, chunks: chunkRows.length, embedded });
  } catch (err) {
    console.error("CV upload error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cv/scores?job_ids=1,2,3
// Returns term-overlap score (0-100) between the active CV and each job.
// No external API calls — pure text matching, safe to call on every page load.
router.get("/scores", async (req, res) => {
  const { job_ids } = req.query;
  if (!job_ids) return res.json({ scores: {} });

  const ids = String(job_ids).split(",").map(Number).filter(Boolean);
  if (!ids.length) return res.json({ scores: {} });

  try {
    const cvTerms = await getActiveCvTerms();
    if (!cvTerms) return res.json({ scores: {} });

    const jobs = await Job.findAll({
      where: { id: ids },
      attributes: ["id", "title", "description"],
    });

    const scores = {};
    for (const job of jobs) {
      scores[job.id] = scoreJobText(
        cvTerms,
        `${job.title || ""} ${(job.description || "").slice(0, 3000)}`
      );
    }

    res.json({ scores });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cv/skill-gap/:jobId
// Diffs the gazetteer skills found in a job against those found in the active CV.
router.get("/skill-gap/:jobId", async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.jobId, {
      attributes: ["id", "title", "description"],
    });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const jobSkills = [
      ...new Set(extractSkills(`${job.title} ${job.description || ""}`).map((s) => s.skill)),
    ];

    const doc = await CvDocument.findOne({
      order: [["created_at", "DESC"]],
      attributes: ["raw_text"],
    });
    if (!doc) {
      return res.json({ has_cv: false, job_skills: jobSkills, matched: [], missing: jobSkills });
    }

    const cvSkills = new Set(extractSkills(doc.raw_text || "").map((s) => s.skill));
    const matched = jobSkills.filter((s) => cvSkills.has(s));
    const missing = jobSkills.filter((s) => !cvSkills.has(s));

    res.json({ has_cv: true, job_skills: jobSkills, matched, missing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cv/:id
router.delete("/:id", async (req, res) => {
  try {
    await CvDocument.destroy({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
