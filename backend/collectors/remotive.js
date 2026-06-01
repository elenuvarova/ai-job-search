import { stripHtml, dedupeHash } from "../nlp/normalize.js";

// 2 calls/day — well within Remotive's ~4 GET/day soft limit
const ENDPOINTS = [
  "https://remotive.com/api/remote-jobs?category=data",
  "https://remotive.com/api/remote-jobs?search=machine+learning",
];

const ROLE_PATTERNS = [
  /machine.?learning/i, /\bml\b/i, /data.?scien/i,
  /\bai\b.*engineer/i, /artificial.?intel/i,
  /mlops/i, /nlp\b/i, /computer.?vision/i,
  /llm\b/i, /deep.?learn/i,
];

// Keep only jobs open to Europe/EMEA/worldwide
const LOCATION_DENY = [/usa.?only/i, /us.?only/i, /canada.?only/i, /australia.?only/i];

function isRelevantRole(title, tags) {
  const text = `${title} ${(tags || []).join(" ")}`;
  return ROLE_PATTERNS.some((p) => p.test(text));
}

function isDeniedLocation(location) {
  return LOCATION_DENY.some((p) => p.test(location || ""));
}

export async function collectRemotive(source) {
  const seen = new Set();
  const jobs = [];

  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "benelux-job-scout/1.0 (personal research tool)" },
      });

      if (!res.ok) {
        console.log(`  Remotive ${url}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const results = data.jobs || [];

      for (const job of results) {
        if (seen.has(job.id)) continue;
        if (!isRelevantRole(job.title, job.tags)) continue;
        if (isDeniedLocation(job.candidate_required_location)) continue;

        seen.add(job.id);
        jobs.push({
          source_id: source.id,
          source_job_id: String(job.id),
          title: job.title,
          company: job.company_name || null,
          country: null, // remote — no specific country
          city: null,
          location_raw: job.candidate_required_location || "Remote",
          description: stripHtml(job.description || ""),
          apply_url: job.url || null,
          posted_at: job.publication_date ? new Date(job.publication_date) : null,
          raw_json: job,
          dedupe_hash: dedupeHash(job.title, job.company_name, "REMOTE"),
        });
      }

      console.log(`  Remotive: fetched ${results.length} from ${url}`);
    } catch (err) {
      console.error(`  Remotive: ${err.message}`);
    }
  }

  console.log(`  Remotive: ${jobs.length} relevant remote jobs`);
  return jobs;
}
