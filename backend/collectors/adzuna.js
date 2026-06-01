import { stripHtml, dedupeHash, sleep } from "../nlp/normalize.js";
import { classifyRemote } from "../nlp/remote.js";
import { classifyEmployment } from "../nlp/employment.js";

// Core Benelux tier — keep every matching role (relocation is on the table here).
// BE and NL have native Adzuna endpoints. LU has no country endpoint, so we use
// GB (the broadest international index) with a "Luxembourg" where-filter.
const CORE = [
  { endpoint: "be", country: "BE", where: null },
  { endpoint: "nl", country: "NL", where: null },
  { endpoint: "gb", country: "LU", where: "Luxembourg" },
];

// Extended EU + UK tier — keep ONLY remote or contract ("на проект") roles, since
// the goal for these countries is remote/freelance work, not relocation.
const EXTENDED = [
  { endpoint: "gb", country: "GB" },
  { endpoint: "de", country: "DE" },
  { endpoint: "fr", country: "FR" },
  { endpoint: "es", country: "ES" },
  { endpoint: "it", country: "IT" },
  { endpoint: "at", country: "AT" },
  { endpoint: "pl", country: "PL" },
];

const QUERIES = ["machine learning", "data scientist", "ai engineer"];
const RESULTS_PER_PAGE = 50;
const BASE = "https://api.adzuna.com/v1/api/jobs";

const REMOTE_HINT =
  /\bremote\b|work.?from.?home|t[ée]l[ée]travail|home.?office|smart.?working|remote.?first|fully.?remote/i;

function parseCity(location) {
  const area = location?.area || [];
  return area[3] || area[2] || null;
}

// Extended-tier gate: a job qualifies only if it reads as remote OR contract.
function isRemoteOrContract(job, title, desc) {
  const text = `${title} ${job.location?.display_name || ""} ${desc}`;
  const remote =
    REMOTE_HINT.test(text) || ["remote", "hybrid"].includes(classifyRemote(title, desc));
  const contract =
    job.contract_type === "contract" ||
    classifyEmployment(title, desc).employment_type === "contract";
  return remote || contract;
}

export async function collectAdzuna(source) {
  const { ADZUNA_APP_ID: appId, ADZUNA_APP_KEY: appKey } = process.env;
  if (!appId || !appKey) {
    console.log("  Adzuna: ADZUNA_APP_ID/KEY not set, skipping");
    return [];
  }

  const configs = [
    ...CORE.map((c) => ({ ...c, extended: false })),
    ...EXTENDED.map((c) => ({ ...c, extended: true })),
  ];

  const jobs = [];
  let apiCalls = 0;

  for (const { endpoint, country, where, extended } of configs) {
    for (const query of QUERIES) {
      let url =
        `${BASE}/${endpoint}/search/1` +
        `?app_id=${appId}&app_key=${appKey}` +
        `&results_per_page=${RESULTS_PER_PAGE}` +
        `&what=${encodeURIComponent(query)}` +
        `&content-type=application/json`;

      if (where) url += `&where=${encodeURIComponent(where)}`;

      try {
        const res = await fetch(url);
        apiCalls++;

        if (!res.ok) {
          console.log(`  Adzuna ${country}/"${query}": HTTP ${res.status}`);
          continue;
        }

        const data = await res.json();
        const results = data.results || [];
        let kept = 0;

        for (const job of results) {
          const desc = stripHtml(job.description || "");
          // Extended EU/UK tier: drop onsite-permanent roles, keep remote/contract.
          if (extended && !isRemoteOrContract(job, job.title || "", desc)) continue;

          jobs.push({
            source_id: source.id,
            source_job_id: String(job.id),
            title: job.title,
            company: job.company?.display_name || null,
            country,
            city: parseCity(job.location),
            location_raw: job.location?.display_name || null,
            description: desc,
            apply_url: job.redirect_url || null,
            posted_at: job.created ? new Date(job.created) : null,
            raw_json: job,
            dedupe_hash: dedupeHash(job.title, job.company?.display_name, country),
          });
          kept++;
        }

        const tier = extended ? "remote/contract" : "all";
        console.log(`  Adzuna ${country}/"${query}": kept ${kept}/${results.length} (${tier})`);
      } catch (err) {
        console.error(`  Adzuna ${country}/"${query}": ${err.message}`);
      }

      await sleep(400);
    }
  }

  console.log(`  Adzuna: ${apiCalls} API calls, ${jobs.length} jobs`);
  return jobs;
}
