import { stripHtml, dedupeHash, sleep } from "../nlp/normalize.js";

// Curated Benelux companies on Recruitee ATS — heavily used by BE/NL firms.
// GET https://{slug}.recruitee.com/api/offers/ → { offers: [...] }, one call,
// description + apply URL + country_code all included. 404 = not on Recruitee.
const COMPANIES = [
  { slug: "dataroots",  name: "Dataroots",  country: "BE", city: "Leuven" },   // Belgian ML pure-play
  { slug: "robovision", name: "Robovision", country: "BE", city: "Ghent" },    // computer-vision platform
  { slug: "dpgmedia",   name: "DPG Media",  country: "BE", city: "Antwerp" },
  { slug: "bunq",       name: "bunq",       country: "NL", city: "Amsterdam" },
  { slug: "intigriti",  name: "Intigriti",  country: "BE", city: "Antwerp" },
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

// Recruitee titles often carry a leading emoji, e.g. "🤝  Senior Data Engineer".
function cleanTitle(title) {
  return (title || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function parseCountry(code, fallback) {
  const c = (code || "").toUpperCase();
  return ["NL", "BE", "LU"].includes(c) ? c : fallback;
}

export async function collectRecruitee(source) {
  const jobs = [];

  for (const company of COMPANIES) {
    try {
      const url = `https://${company.slug}.recruitee.com/api/offers/`;
      const res = await fetch(url, {
        headers: { "User-Agent": "benelux-job-scout/1.0 (personal research tool)" },
      });

      if (res.status === 404) continue; // not on Recruitee — silent skip
      if (!res.ok) {
        console.log(`  Recruitee/${company.slug}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const offers = data.offers || [];
      let added = 0;

      for (const o of offers) {
        if (o.status && o.status !== "published") continue;
        const title = cleanTitle(o.title);
        if (!isRelevant(title)) continue;

        const country = parseCountry(o.country_code, company.country);
        const desc = stripHtml(`${o.description || ""} ${o.requirements || ""}`);

        jobs.push({
          source_id: source.id,
          source_job_id: `${company.slug}/${o.id}`,
          title: title.slice(0, 300),
          company: company.name,
          country,
          city: o.city || company.city,
          location_raw: o.location || o.city || company.city || null,
          description: desc,
          apply_url: o.careers_url || o.careers_apply_url || null,
          posted_at: o.published_at
            ? new Date(o.published_at)
            : o.created_at
            ? new Date(o.created_at)
            : null,
          raw_json: { id: o.id, _slug: company.slug },
          dedupe_hash: dedupeHash(title, company.name, country || ""),
        });
        added++;
      }

      console.log(`  Recruitee/${company.slug}: ${added} relevant / ${offers.length} total`);
    } catch (err) {
      console.error(`  Recruitee/${company.slug}: ${err.message}`);
    }

    await sleep(300);
  }

  console.log(`  Recruitee: ${jobs.length} relevant jobs total`);
  return jobs;
}
