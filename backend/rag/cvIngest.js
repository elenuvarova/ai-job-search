import { createRequire } from "module";
import { CvDocument, CvChunk } from "../models/index.js";
import { chunkText } from "./chunk.js";
import { embedBatch } from "./embed.js";

// pdf-parse and mammoth ship CommonJS — load via createRequire in this ESM file.
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse"); // pdf-parse v2 exports a class, not a function
const mammoth = require("mammoth");

export const PDF_MIME = "application/pdf";
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractCvText(buffer, mimetype) {
  if (mimetype === PDF_MIME) {
    const parser = new PDFParse({ data: buffer });
    try {
      const { text } = await parser.getText();
      // pdf.js appends a "-- N of M --" page marker per page; strip it.
      return (text || "").replace(/\n*-- \d+ of \d+ --\n*/g, "\n").trim();
    } finally {
      if (parser.destroy) await parser.destroy();
    }
  }
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// Replace the single active CV (one employee, one CV) with this document.
// Embedding is batched and NON-FATAL: the CV still works for term-overlap match /
// skill-gap even if embedding fails; only RAG retrieval degrades.
export async function ingestCv({ buffer, mimetype, label }) {
  const text = await extractCvText(buffer, mimetype);
  if (!text || text.trim().length < 20) {
    throw new Error("Could not extract text from the CV (a scanned/image-only PDF?).");
  }

  const chunks = chunkText(text);

  await CvDocument.destroy({ where: {} }); // chunks cascade-delete

  const doc = await CvDocument.create({
    label,
    raw_text: text,
    char_count: text.length,
  });

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

  return { id: doc.id, label, chunks: chunkRows.length, embedded };
}
