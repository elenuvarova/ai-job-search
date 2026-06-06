import { Op } from "sequelize";
import { Job } from "../models/index.js";
import { cosineSim } from "./embed.js";

// Brute-force cosine ranking of all embedded jobs against a query vector.
// Fine for a single-user corpus (hundreds–low thousands of jobs).
// Returns [{ id, score }] sorted by similarity desc.
export async function rankByEmbedding(queryVec, { excludeId = null, limit = 25 } = {}) {
  if (!Array.isArray(queryVec) || !queryVec.length) return [];

  const rows = await Job.findAll({
    where: { embedding: { [Op.not]: null } },
    attributes: ["id", "embedding"],
  });

  const scored = [];
  for (const r of rows) {
    if (excludeId != null && r.id === excludeId) continue;
    const emb = r.embedding;
    if (!Array.isArray(emb) || emb.length !== queryVec.length) continue;
    scored.push({ id: r.id, score: cosineSim(queryVec, emb) });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
