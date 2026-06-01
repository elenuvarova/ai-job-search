import { stripHtml, dedupeHash, sleep } from "../nlp/normalize.js";

// Curated Benelux tech companies on Greenhouse ATS.
// 404s are handled gracefully — add/remove tokens freely.
const COMPANIES = [
  // Belgium
  { token: "collibra",   name: "Collibra",   country: "BE", city: "Brussels" },
  { token: "showpad",    name: "Showpad",     country: "BE", city: "Ghent" },
  { token: "teamleader", name: "Teamleader",  country: "BE", city: "Ghent" },
  { token: "datacamp",   name: "DataCamp",    country: "BE", city: "Brussels" },
  { token: "silverfin",  name: "Silverfin",   country: "BE", city: "Ghent" },
  // Netherlands
  { token: "adyen",       name: "Adyen",       country: "NL", city: "Amsterdam" },
  { token: "mollie",      name: "Mollie",      country: "NL", city: "Amsterdam" },
  { token: "catawiki",    name: "Catawiki",    country: "NL", city: "Amsterdam" },
  { token: "backbase",    name: "Backbase",    country: "NL", city: "Amsterdam" },
  { token: "bynder",      name: "Bynder",      country: "NL", city: "Amsterdam" },
  { token: "messagebird", name: "MessageBird", country: "NL", city: "Amsterdam" },
  { token: "picnic",      name: "Picnic",      country: "NL", city: "Amsterdam" },
  { token: "tomtom",      name: "TomTom",      country: "NL", city: "Amsterdam" },
  { token: "booking",     name: "Booking.com", country: "NL", city: "Amsterdam" },
  { token: "wetransfer",  name: "WeTransfer",  country: "NL", city: "Amsterdam" },
];

const ROLE_PATTERNS = [
  /machine.?learning/i, /\bml\b/i, /data.?scien/i,
  /\bai\b/i, /artificial.?intel/i, /mlops/i, /\bnlp\b/i,
  /computer.?vision/i, /\bllm\b/i, /deep.?learn/i,
  /data.?engineer/i, /analytics/i, /data.?analys/i,
  /generative.?ai/i, /foundation.?model/i,
];

function isRelevant(title) {
  return ROLE_PATTERNS.some((p) => p.test(title));
}

function parseCountry(locationName, fallback) {
  if (!locationName) return fallback;
  if (/netherlands|amsterdam|rotterdam|utrecht|eindhoven|delft|the hague/i.test(locationName)) return "NL";
  if (/belgium|brussels|ghent|antwerp|leuven|bruges|liège/i.test(locationName)) return "BE";
  if (/luxembourg/i.test(locationName)) return "LU";
  return fallback;
}

export async function collectGreenhouse(source) {
  const jobs = [];

  for (const company of COMPANIES) {
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs?content=true`;
      const res = await fetch(url, {
        headers: { "User-Agent": "benelux-job-scout/1.0 (personal research tool)" },
      });

      if (res.status === 404) {
        // Company not on Greenhouse — silent skip
        continue;
      }
      if (!res.ok) {
        console.log(`  Greenhouse/${company.token}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const allJobs = data.jobs || [];
      let added = 0;

      for (const job of allJobs) {
        if (!isRelevant(job.title)) continue;

        const locationName = job.location?.name || null;
        const country = parseCountry(locationName, company.country);
        const city = locationName?.split(",")[0]?.trim() || company.city;

        jobs.push({
          source_id: source.id,
          source_job_id: `${company.token}/${job.id}`,
          title: job.title,
          company: company.name,
          country,
          city,
          location_raw: locationName || company.city || null,
          description: stripHtml(job.content || ""),
          apply_url: job.absolute_url || null,
          posted_at: job.updated_at ? new Date(job.updated_at) : null,
          raw_json: { id: job.id, _token: company.token },
          dedupe_hash: dedupeHash(job.title, company.name, country || ""),
        });
        added++;
      }

      console.log(`  Greenhouse/${company.token}: ${added} relevant / ${allJobs.length} total`);
    } catch (err) {
      console.error(`  Greenhouse/${company.token}: ${err.message}`);
    }

    await sleep(300);
  }

  console.log(`  Greenhouse: ${jobs.length} relevant jobs total`);
  return jobs;
}
