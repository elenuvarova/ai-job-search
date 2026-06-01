import { stripHtml, dedupeHash, sleep } from "../nlp/normalize.js";

const BASE = "https://www.themuse.com/api/public/jobs";
const RESULTS_PER_PAGE = 20;

// The Muse location filters that map to Benelux
const LOCATIONS = [
  { label: "Brussels, Belgium", country: "BE", city: "Brussels" },
  { label: "Antwerp, Belgium", country: "BE", city: "Antwerp" },
  { label: "Amsterdam, Netherlands", country: "NL", city: "Amsterdam" },
  { label: "Rotterdam, Netherlands", country: "NL", city: "Rotterdam" },
  { label: "Luxembourg, Luxembourg", country: "LU", city: "Luxembourg City" },
];

// Role categories available on The Muse
const CATEGORIES = ["Data Science", "Software Engineer"];

export async function collectMuse(source) {
  const apiKey = process.env.THE_MUSE_API_KEY;
  if (!apiKey) {
    console.log("  The Muse: THE_MUSE_API_KEY not set, skipping");
    return [];
  }

  const seen = new Set();
  const jobs = [];

  for (const { label, country, city } of LOCATIONS) {
    for (const category of CATEGORIES) {
      const url =
        `${BASE}?api_key=${apiKey}` +
        `&category=${encodeURIComponent(category)}` +
        `&location=${encodeURIComponent(label)}` +
        `&page=1&count=${RESULTS_PER_PAGE}`;

      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.log(`  Muse ${country}/${category}: HTTP ${res.status}`);
          continue;
        }

        const data = await res.json();
        const results = data.results || [];

        for (const job of results) {
          if (seen.has(job.id)) continue;
          seen.add(job.id);

          jobs.push({
            source_id: source.id,
            source_job_id: String(job.id),
            title: job.name,
            company: job.company?.name || null,
            country,
            city,
            location_raw: label,
            description: stripHtml(job.contents || ""),
            apply_url: job.refs?.landing_page || null,
            posted_at: job.publication_date ? new Date(job.publication_date) : null,
            raw_json: job,
            dedupe_hash: dedupeHash(job.name, job.company?.name, country),
          });
        }

        console.log(`  Muse ${country}/"${category}": ${results.length} results`);
      } catch (err) {
        console.error(`  Muse ${country}/"${category}": ${err.message}`);
      }

      await sleep(300);
    }
  }

  console.log(`  Muse: ${jobs.length} jobs total`);
  return jobs;
}
