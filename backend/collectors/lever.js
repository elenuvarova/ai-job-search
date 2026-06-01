import { stripHtml, dedupeHash, sleep } from "../nlp/normalize.js";

// Curated Benelux-connected companies on Lever ATS.
// ?mode=json returns a JSON array; 404 = company not on Lever.
const COMPANIES = [
  // Belgium
  { slug: "lightspeed",     name: "Lightspeed",     country: "BE", city: "Ghent" },
  // Netherlands
  { slug: "sendcloud",      name: "Sendcloud",      country: "NL", city: "Eindhoven" },
  { slug: "channable",      name: "Channable",      country: "NL", city: "Utrecht" },
  { slug: "temper",         name: "Temper",         country: "NL", city: "Amsterdam" },
  // EU remote / offices in Benelux
  { slug: "mews",           name: "Mews",           country: null, city: null },
  { slug: "aircall",        name: "Aircall",        country: null, city: null },
  { slug: "spendesk",       name: "Spendesk",       country: null, city: null },
  { slug: "alan",           name: "Alan",           country: null, city: null },
  { slug: "mirakl",         name: "Mirakl",         country: null, city: null },
  { slug: "contentsquare",  name: "Contentsquare",  country: null, city: null },
  { slug: "payfit",         name: "PayFit",         country: null, city: null },
  { slug: "qonto",          name: "Qonto",          country: null, city: null },
  { slug: "doctrine",       name: "Doctrine",       country: null, city: null },
  { slug: "pennylane",      name: "Pennylane",      country: null, city: null },
  { slug: "swile",          name: "Swile",          country: null, city: null },
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

function parseCountry(location, fallback) {
  if (!location) return fallback;
  if (/netherlands|amsterdam|rotterdam|utrecht|eindhoven/i.test(location)) return "NL";
  if (/belgium|brussels|ghent|antwerp/i.test(location)) return "BE";
  if (/luxembourg/i.test(location)) return "LU";
  return fallback;
}

export async function collectLever(source) {
  const jobs = [];

  for (const company of COMPANIES) {
    try {
      const url = `https://api.lever.co/v0/postings/${company.slug}?mode=json`;
      const res = await fetch(url, {
        headers: { "User-Agent": "benelux-job-scout/1.0 (personal research tool)" },
      });

      if (res.status === 404) {
        // Company not on Lever — silent skip
        continue;
      }
      if (!res.ok) {
        console.log(`  Lever/${company.slug}: HTTP ${res.status}`);
        continue;
      }

      const postings = await res.json();
      if (!Array.isArray(postings)) continue;

      let added = 0;
      for (const p of postings) {
        if (!isRelevant(p.text || "")) continue;

        const location = p.categories?.location || null;
        const country = parseCountry(location, company.country);
        const city = location?.split(",")[0]?.trim() || company.city;

        // Combine description + lists for full text
        const listsText = (p.lists || [])
          .map((l) => `${l.text || ""}\n${l.content || ""}`)
          .join("\n");
        const desc = stripHtml(`${p.description || ""} ${listsText} ${p.additional || ""}`);

        jobs.push({
          source_id: source.id,
          source_job_id: p.id,
          title: p.text,
          company: company.name,
          country,
          city,
          location_raw: location || company.city || null,
          description: desc,
          apply_url: p.applyUrl || p.hostedUrl || null,
          // createdAt is Unix ms from Lever
          posted_at: p.createdAt ? new Date(p.createdAt) : null,
          raw_json: { id: p.id, _slug: company.slug },
          dedupe_hash: dedupeHash(p.text, company.name, country || ""),
        });
        added++;
      }

      console.log(`  Lever/${company.slug}: ${added} relevant / ${postings.length} total`);
    } catch (err) {
      console.error(`  Lever/${company.slug}: ${err.message}`);
    }

    await sleep(300);
  }

  console.log(`  Lever: ${jobs.length} relevant jobs total`);
  return jobs;
}
