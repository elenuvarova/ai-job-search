// Gemini text-embedding-004 — free, 768-dim, multilingual EN/NL/FR/DE
const EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

export async function embed(text) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(`${EMBED_URL}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text: text.slice(0, 2048) }] },
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
