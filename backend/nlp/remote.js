const REMOTE_RE = /\b(fully[\s-]?remote|100%\s*remote|remote[\s-]?first|remote[\s-]?only|work\s+from\s+home|télétravail\s+complet|vollständig\s+remote|thuiswerk)\b/i;
const HYBRID_RE = /\b(hybrid|hybride|hybridmodel|gedeeltelijk\s+thuiswerk|teilweise\s+remote|days?\s+(?:in[\s-]?office|on[\s-]?site)|flexible\s+working)\b/i;
const ONSITE_RE = /\b(on[\s-]?site|on[\s-]?location|in[\s-]?office|in[\s-]?person|no\s+remote|kantoor|volledig\s+op\s+kantoor|vor\s+ort)\b/i;

export function classifyRemote(title, description) {
  const text = `${title} ${description || ""}`;

  if (REMOTE_RE.test(text)) return "remote";
  if (HYBRID_RE.test(text)) return "hybrid";
  if (ONSITE_RE.test(text)) return "onsite";
  return "unknown";
}
