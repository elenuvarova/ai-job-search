// Daily job collection script — run via GitHub Actions cron or POST /api/collect/run
import "dotenv/config";
import { sequelize } from "../db.js";
import { syncModels, Source, Job } from "../models/index.js";
import { collectAdzuna } from "../collectors/adzuna.js";
import { collectArbeitnow } from "../collectors/arbeitnow.js";
import { collectRemotive } from "../collectors/remotive.js";
import { collectMuse } from "../collectors/muse.js";
import { collectRemoteok } from "../collectors/remoteok.js";
import { collectGreenhouse } from "../collectors/greenhouse.js";
import { collectLever } from "../collectors/lever.js";
import { collectHnHiring } from "../collectors/hn-hiring.js";

const SOURCES = [
  {
    key: "adzuna",
    label: "Adzuna",
    attribution_html:
      '<a href="https://www.adzuna.com" rel="noopener">Jobs by Adzuna</a>',
    collect: collectAdzuna,
  },
  {
    key: "arbeitnow",
    label: "Arbeitnow",
    attribution_html:
      '<a href="https://www.arbeitnow.com" rel="noopener">Jobs via Arbeitnow</a>',
    collect: collectArbeitnow,
  },
  {
    key: "remotive",
    label: "Remotive",
    attribution_html:
      '<a href="https://remotive.com" rel="noopener">Remote jobs via Remotive</a>',
    collect: collectRemotive,
  },
  {
    key: "muse",
    label: "The Muse",
    attribution_html:
      '<a href="https://www.themuse.com" rel="noopener">Jobs via The Muse</a>',
    collect: collectMuse,
  },
  {
    key: "remoteok",
    label: "RemoteOK",
    attribution_html:
      '<a href="https://remoteok.com" rel="noopener">Remote jobs via RemoteOK</a>',
    collect: collectRemoteok,
  },
  {
    key: "greenhouse",
    label: "Company Boards (Greenhouse)",
    attribution_html: null,
    collect: collectGreenhouse,
  },
  {
    key: "lever",
    label: "Company Boards (Lever)",
    attribution_html: null,
    collect: collectLever,
  },
  {
    key: "hn_hiring",
    label: "HN: Who's Hiring",
    attribution_html:
      '<a href="https://news.ycombinator.com" rel="noopener">Via Hacker News</a>',
    collect: collectHnHiring,
  },
];

async function upsertSource(def) {
  const [source] = await Source.findOrCreate({
    where: { key: def.key },
    defaults: {
      label: def.label,
      attribution_html: def.attribution_html,
      enabled: true,
    },
  });
  return source;
}

async function saveJobs(rawJobs) {
  let created = 0;
  let skipped = 0;

  for (const jobData of rawJobs) {
    try {
      const [, wasCreated] = await Job.findOrCreate({
        where: { source_id: jobData.source_id, source_job_id: jobData.source_job_id },
        defaults: jobData,
      });
      if (wasCreated) created++;
      else skipped++;
    } catch (err) {
      // Unique constraint on dedupe_hash from another source — silent skip
      if (err.name === "SequelizeUniqueConstraintError") {
        skipped++;
      } else {
        console.error(`  Save error: ${err.message}`);
      }
    }
  }

  return { created, skipped };
}

export async function runCollect() {
  const startedAt = new Date();
  console.log(`\n[collect] started ${startedAt.toISOString()}`);

  await syncModels();

  const totals = { created: 0, skipped: 0, errors: 0 };

  for (const def of SOURCES) {
    const source = await upsertSource(def);
    if (!source.enabled) {
      console.log(`[${def.key}] disabled, skipping`);
      continue;
    }

    console.log(`\n[${def.key}] collecting…`);
    try {
      const rawJobs = await def.collect(source);
      const { created, skipped } = await saveJobs(rawJobs);
      totals.created += created;
      totals.skipped += skipped;
      console.log(`[${def.key}] +${created} new, ${skipped} already known`);
    } catch (err) {
      console.error(`[${def.key}] fatal: ${err.message}`);
      totals.errors++;
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `\n[collect] done in ${elapsed}s — +${totals.created} new jobs, ${totals.skipped} skipped, ${totals.errors} source errors`
  );

  return { ...totals, elapsed_s: parseFloat(elapsed), started_at: startedAt };
}

// Run directly (GitHub Actions or manual CLI)
if (process.argv[1].endsWith("collect.js")) {
  try {
    await runCollect();
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("[collect] fatal:", err);
    await sequelize.close();
    process.exit(1);
  }
}
