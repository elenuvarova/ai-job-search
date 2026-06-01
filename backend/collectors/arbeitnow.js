import { stripHtml, dedupeHash, sleep } from "../nlp/normalize.js";

const BASE = "https://www.arbeitnow.com/api/job-board-api";
const MAX_PAGES = 5;

// Benelux location signals (case-insensitive)
const BENELUX_PATTERNS = [
  /netherlands/i, /nederland/i, /\bnl\b/i,
  /belgium/i, /belgien/i, /belgique/i, /belgi[eë]/i,
  /luxembourg/i, /luxemburg/i, /\blu\b/i,
];

// Role title/tag patterns to keep AI/ML/Data roles
const ROLE_PATTERNS = [
  /machine.?learning/i, /\bml\b/i, /data.?scien/i,
  /\bai\b.*engineer/i, /artificial.?intel/i,
  /mlops/i, /nlp\b/i, /computer.?vision/i,
  /llm\b/i, /deep.?learn/i, /data.?engineer/i,
];

function isRelevantLocation(location, remote) {
  if (remote) return true;
  return BENELUX_PATTERNS.some((p) => p.test(location || ""));
}

function isRelevantRole(title, tags) {
  const text = `${title} ${(tags || []).join(" ")}`;
  return ROLE_PATTERNS.some((p) => p.test(text));
}

function inferCountry(location) {
  if (!location) return null;
  if (/netherlands|nederland/i.test(location)) return "NL";
  if (/belgium|belgien|belgique|belgi/i.test(location)) return "BE";
  if (/luxembourg/i.test(location)) return "LU";
  return null;
}

export async function collectArbeitnow(source) {
  const jobs = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    try {
      const res = await fetch(`${BASE}?page=${page}`);
      if (!res.ok) {
        console.log(`  Arbeitnow page ${page}: HTTP ${res.status}`);
        break;
      }

      const data = await res.json();
      const results = data.data || [];
      if (results.length === 0) break;

      for (const job of results) {
        if (!isRelevantLocation(job.location, job.remote)) continue;
        if (!isRelevantRole(job.title, job.tags)) continue;

        const country = inferCountry(job.location);
        jobs.push({
          source_id: source.id,
          source_job_id: job.slug,
          title: job.title,
          company: job.company_name || null,
          country,
          city: null,
          location_raw: job.location || null,
          description: stripHtml(job.description || ""),
          apply_url: job.url || null,
          posted_at: job.created_at ? new Date(job.created_at * 1000) : null,
          raw_json: job,
          dedupe_hash: dedupeHash(job.title, job.company_name, country),
        });
      }

      console.log(`  Arbeitnow page ${page}: ${results.length} total, kept ${jobs.length} so far`);

      if (!data.links?.next) break;
      page++;
      await sleep(300);
    } catch (err) {
      console.error(`  Arbeitnow page ${page}: ${err.message}`);
      break;
    }
  }

  return jobs;
}
