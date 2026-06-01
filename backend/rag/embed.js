// Gemini gemini-embedding-001 — free, multilingual EN/NL/FR/DE.
// (text-embedding-004 was shut down 2026-01-14; this is its stable replacement.)
// outputDimensionality pinned to 768 to match the stored CvChunk vectors and cosineSim.
// NOTE: vectors from the old model live in a different space — re-upload the CV after this change.
const EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

export async function embed(text) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(`${EMBED_URL}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text: text.slice(0, 2048) }] },
      outputDimensionality: 768,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embed HTTP ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.embedding.values; // float[768]
}

export function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
