import { stripHtml, dedupeHash } from "../nlp/normalize.js";

// Jobicy — remote jobs with a working Europe geo filter. Zero-auth.
// All jobs are remote, so they fit the "other EU/UK = remote-first" goal.
// GET /api/v2/remote-jobs?geo=europe&industry=data-science&count=50
const URL = "https://jobicy.com/api/v2/remote-jobs?count=50&geo=europe&industry=data-science";

const ROLE_PATTERNS = [
  /machine.?learning/i, /\bml\b/i, /data.?scien/i,
  /\bai\b/i, /artificial.?intel/i, /mlops/i, /\bnlp\b/i,
  /computer.?vision/i, /\bllm\b/i, /deep.?learn/i,
  /data.?engineer/i, /analytics/i, /data.?analys/i,
  /generative.?ai/i, /foundation.?model/i,
];

function isRelevant(title) {
  return ROLE_PATTERNS.some((p) => p.test(title || ""));
}

export async function collectJobicy(source) {
  const jobs = [];

  try {
    const res = await fetch(URL, {
      headers: {
        "User-Agent": "benelux-job-scout/1.0 (personal research tool)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.log(`  Jobicy: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const items = data.jobs || [];

    for (const j of items) {
      const title = j.jobTitle || "";
      if (!isRelevant(title)) continue;

      jobs.push({
        source_id: source.id,
        source_job_id: String(j.id),
        title: title.slice(0, 300),
        company: j.companyName || null,
        country: null, // remote — no specific country
        city: null,
        location_raw: j.jobGeo || "Remote (Europe)",
        description: stripHtml(j.jobDescription || j.jobExcerpt || ""),
        apply_url: j.url || null,
        posted_at: j.pubDate ? new Date(j.pubDate) : null,
        raw_json: { id: j.id, geo: j.jobGeo },
        dedupe_hash: dedupeHash(title, j.companyName, "REMOTE"),
      });
    }

    console.log(`  Jobicy: ${jobs.length} relevant from ${items.length} total`);
  } catch (err) {
    console.error(`  Jobicy: ${err.message}`);
  }

  return jobs;
}
