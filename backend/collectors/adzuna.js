import { stripHtml, dedupeHash, sleep } from "../nlp/normalize.js";

// BE and NL have native Adzuna endpoints.
// LU has no Adzuna country endpoint — we use GB (broadest international index)
// with a "Luxembourg" where-filter instead.
const COUNTRY_CONFIGS = [
  { endpoint: "be", country: "BE", where: null },
  { endpoint: "nl", country: "NL", where: null },
  { endpoint: "gb", country: "LU", where: "Luxembourg" },
];
const QUERIES = ["machine learning", "data scientist", "ai engineer"];
const RESULTS_PER_PAGE = 50;
const BASE = "https://api.adzuna.com/v1/api/jobs";

function parseCity(location) {
  const area = location?.area || [];
  return area[3] || area[2] || null;
}

export async function collectAdzuna(source) {
  const { ADZUNA_APP_ID: appId, ADZUNA_APP_KEY: appKey } = process.env;
  if (!appId || !appKey) {
    console.log("  Adzuna: ADZUNA_APP_ID/KEY not set, skipping");
    return [];
  }

  const jobs = [];
  let apiCalls = 0;

  for (const { endpoint, country, where } of COUNTRY_CONFIGS) {
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

        for (const job of results) {
          jobs.push({
            source_id: source.id,
            source_job_id: String(job.id),
            title: job.title,
            company: job.company?.display_name || null,
            country,
            city: parseCity(job.location),
            location_raw: job.location?.display_name || null,
            description: stripHtml(job.description || ""),
            apply_url: job.redirect_url || null,
            posted_at: job.created ? new Date(job.created) : null,
            raw_json: job,
            dedupe_hash: dedupeHash(job.title, job.company?.display_name, country),
          });
        }

        console.log(`  Adzuna ${country}/"${query}": ${results.length} results`);
      } catch (err) {
        console.error(`  Adzuna ${country}/"${query}": ${err.message}`);
      }

      await sleep(400);
    }
  }

  console.log(`  Adzuna: ${apiCalls} API calls, ${jobs.length} raw jobs`);
  return jobs;
}
