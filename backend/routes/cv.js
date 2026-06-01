import { Router } from "express";
import { createRequire } from "module";
import multer from "multer";

// pdf-parse and mammoth ship CommonJS — use createRequire in an ESM context
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
import { CvDocument, CvChunk, Job } from "../models/index.js";
import { chunkText } from "../rag/chunk.js";
import { embed } from "../rag/embed.js";
import { sleep } from "../nlp/normalize.js";

// Generic English/HR stop-words that carry no discriminative signal
const STOP_WORDS = new Set([
  "the","and","for","are","was","were","will","with","this","that","have",
  "from","they","their","our","you","your","but","not","all","can","her",
  "his","who","how","when","what","which","more","also","been","has","had",
  "its","about","into","than","then","them","some","such","other","these",
  "those","very","just","over","both","each","much","work","team","role",
  "based","using","experience","years","strong","good","great","high",
  "excellent","understanding","knowledge","skills","ability","looking",
  "seeking","join","help","build","like","make","take","working","minimum",
  "required","requirements","responsibilities","opportunity","position",
  "candidate","ideal","preferred","able","across","within","between",
  "under","well","including","following","related","relevant","similar",
  "company","new","use","used","get","day","time","way","level","highly",
  "field","areas","area","etc","please","apply","send","email","contact",
  "offer","benefits","salary","bonus","vacation","holiday","insurance",
  "pension","remote","office","hybrid","flexible","hours","week","month",
  "full","part","contract","permanent","fixed","term","open","end",
  "what","you","will","doing","about","come","what","your","ideal",
]);

function extractTerms(text) {
  return new Set(
    (text || "").toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !STOP_WORDS.has(t))
  );
}

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

    // Store document
    const doc = await CvDocument.create({
      label: req.file.originalname,
      raw_text: text,
      char_count: text.length,
    });

    // Embed each chunk — one at a time with a small delay to stay within rate limits
    const chunkRows = [];
    for (const chunk of chunks) {
      const embedding = await embed(chunk);
      chunkRows.push({ cv_document_id: doc.id, chunk_text: chunk, embedding });
      await sleep(300);
    }

    await CvChunk.bulkCreate(chunkRows);

    res.json({ id: doc.id, label: doc.label, chunks: chunkRows.length });
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
    const doc = await CvDocument.findOne({ order: [["created_at", "DESC"]] });
    if (!doc) return res.json({ scores: {} });

    const chunks = await CvChunk.findAll({
      where: { cv_document_id: doc.id },
      attributes: ["chunk_text"],
    });
    if (!chunks.length) return res.json({ scores: {} });

    const cvTerms = extractTerms(chunks.map((c) => c.chunk_text).join(" "));

    const jobs = await Job.findAll({
      where: { id: ids },
      attributes: ["id", "title", "description"],
    });

    const scores = {};
    for (const job of jobs) {
      const jobText = `${job.title || ""} ${(job.description || "").slice(0, 3000)}`;
      const jobTerms = extractTerms(jobText);
      const hits = [...cvTerms].filter((t) => jobTerms.has(t)).length;
      scores[job.id] = cvTerms.size ? Math.round((hits / cvTerms.size) * 100) : 0;
    }

    res.json({ scores });
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
