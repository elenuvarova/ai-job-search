import { Router } from "express";
import { createRequire } from "module";
import multer from "multer";

// pdf-parse and mammoth ship CommonJS — use createRequire in an ESM context
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
import { CvDocument, CvChunk } from "../models/index.js";
import { chunkText } from "../rag/chunk.js";
import { embed } from "../rag/embed.js";
import { sleep } from "../nlp/normalize.js";

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
