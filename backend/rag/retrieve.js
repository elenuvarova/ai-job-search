import { CvChunk } from "../models/index.js";
import { cosineSim } from "./embed.js";

export async function retrieveTopChunks(cvDocumentId, queryEmbedding, k = 5) {
  const chunks = await CvChunk.findAll({
    where: { cv_document_id: cvDocumentId },
    attributes: ["chunk_text", "embedding"],
  });

  return chunks
    .map((c) => ({
      text: c.chunk_text,
      score: cosineSim(queryEmbedding, c.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((c) => c.text);
}
