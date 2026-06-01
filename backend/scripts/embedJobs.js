// Backfill job embeddings for semantic search / "find similar" / chat.
// Runs nightly after collect + classify; capped per run to stay within the
// Gemini embedding free quota. New jobs get embedded over subsequent runs.
import "dotenv/config";
import { Op } from "sequelize";
import { sequelize } from "../db.js";
import { syncModels, Job } from "../models/index.js";
import { embed } from "../rag/embed.js";
import { sleep } from "../nlp/normalize.js";

const MAX_PER_RUN = 80;
const EMBED_DELAY_MS = 300;

export async function runEmbedJobs() {
  await syncModels();

  const jobs = await Job.findAll({
    where: { embedding: { [Op.is]: null } },
    attributes: ["id", "title", "description"],
    // Newest first, undated last (NULLs sort last across both dialects).
    order: [[sequelize.literal("posted_at IS NULL"), "ASC"], ["posted_at", "DESC"]],
    limit: MAX_PER_RUN,
  });
  console.log(`[embed] ${jobs.length} jobs to embed (cap ${MAX_PER_RUN})`);

  let done = 0;
  for (const job of jobs) {
    const text = `${job.title || ""}\n${(job.description || "").slice(0, 2000)}`.trim();
    if (!text) continue; // empty record would 400 on the embed API and re-poison the queue
    try {
      const vec = await embed(text);
      await job.update({ embedding: vec });
      done++;
    } catch (err) {
      console.error(`  embed job ${job.id}: ${err.message}`);
      if (/quota|429|rate/i.test(err.message)) {
        console.log("[embed] quota/rate limit hit — stopping early");
        break;
      }
    }
    await sleep(EMBED_DELAY_MS);
  }

  console.log(`[embed] embedded ${done} jobs`);
  return { embedded: done };
}

if (process.argv[1].endsWith("embedJobs.js")) {
  try {
    await runEmbedJobs();
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("[embed] fatal:", err);
    await sequelize.close();
    process.exit(1);
  }
}
