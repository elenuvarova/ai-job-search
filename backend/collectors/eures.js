import { stripHtml, dedupeHash, sleep } from "../nlp/normalize.js";

// EURES — the EU public job-mobility portal. Zero-auth JSON search API.
// This is the project's only free source with NATIVE Luxembourg coverage,
// plus large BE/NL public-sector volume the company boards never see.
const SEARCH_URL =
  "https://europa.eu/eures/api/jv-searchengine/public/jv-search/search?lang=en&app=0.27.0";
const DETAIL_URL = "https://europa.eu/eures/portal/jv-se/jv-details";

// Benelux only — that's the whole reason we reach for EURES here.
const LOCATION_CODES = ["lu", "be", "nl"];

// One pass per keyword. `EVERYWHERE` matches description text too, so each pass
// is broad — BEST_MATCH ranks the most relevant first and the title filter
// (ROLE_PATTERNS) below drops the noise. Verified: BEST_MATCH keeps ~50/50 on
// page 1, while MOST_RECENT keeps ~0/50.
const KEYWORDS = [
  "machine learning",
  "data scientist",
  "data engineer",
  "artificial intelligence",
];

const MAX_PAGES = 2; // up to 2 × 50 = 100 ranked hits per keyword
const RESULTS_PER_PAGE = 50;

const ROLE_PATTERNS = [
  /machine.?learning/i, /\bml\b/i, /data.?scien/i,
  /\bai\b/i, /artificial.?intel/i, /mlops/i, /\bnlp\b/i,
  /computer.?vision/i, /\bllm\b/i, /deep.?learn/i,
  /data.?engineer/i, /analytics/i, /data.?analys/i,
  /generative.?ai/i, /foundation.?model/i,
];

const COUNTRY_NAMES = { LU: "Luxembourg", BE: "Belgium", NL: "Netherlands" };

function isRelevant(title) {
  return ROLE_PATTERNS.some((p) => p.test(title || ""));
}

// locationMap keys are uppercase country codes, e.g. { LU: [null] }.
function pickCountry(locationMap) {
  const codes = Object.keys(locationMap || {}).map((c) => c.toUpperCase());
  return ["LU", "BE", "NL"].find((c) => codes.includes(c)) || codes[0] || null;
}

// employer.name is frequently the French placeholder "non renseigné" (= not provided).
function cleanCompany(employer) {
  const name = (employer?.name || "").trim();
  if (!name || /^non renseign/i.test(name)) return null;
  return name.slice(0, 200);
}

async function search(keyword, page) {
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "benelux-job-scout/1.0 (personal research tool)",
    },
    body: JSON.stringify({
      resultsPerPage: RESULTS_PER_PAGE,
      page,
      sortSearch: "BEST_MATCH",
      keywords: [{ keyword, specificSearchCode: "EVERYWHERE" }],
      locationCodes: LOCATION_CODES,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function collectEures(source) {
  const jobs = [];
  const seen = new Set(); // dedupe by EURES id across keyword passes

  for (const keyword of KEYWORDS) {
    let kept = 0;

    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const data = await search(keyword, page);
        const jvs = data.jvs || [];
        if (jvs.length === 0) break;

        for (const jv of jvs) {
          if (!jv.id || seen.has(jv.id)) continue;
          if (!isRelevant(jv.title)) continue;
          seen.add(jv.id);

          const country = pickCountry(jv.locationMap);
          const company = cleanCompany(jv.employer);

          jobs.push({
            source_id: source.id,
            source_job_id: jv.id,
            title: (jv.title || "").slice(0, 300),
            company,
            country,
            city: null,
            location_raw: COUNTRY_NAMES[country] || country || null,
            description: stripHtml(jv.description || ""),
            apply_url: `${DETAIL_URL}/${encodeURIComponent(jv.id)}?lang=en`,
            posted_at: jv.creationDate ? new Date(jv.creationDate) : null,
            raw_json: { id: jv.id, _keyword: keyword },
            dedupe_hash: dedupeHash(jv.title, company || "", country || ""),
          });
          kept++;
        }

        if (jvs.length < RESULTS_PER_PAGE) break; // last page
        await sleep(400);
      } catch (err) {
        console.error(`  EURES/"${keyword}" p${page}: ${err.message}`);
        break;
      }
    }

    console.log(`  EURES/"${keyword}": kept ${kept}`);
    await sleep(400);
  }

  console.log(`  EURES: ${jobs.length} relevant Benelux ML/Data jobs total`);
  return jobs;
}
