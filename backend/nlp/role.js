// Multilingual role-family classifier — rule-based, no API calls

const FAMILIES = [
  {
    family: "ML Engineering",
    patterns: [
      /machine[-\s]?learning\s*engineer/i, /\bml\s*engineer\b/i,
      /engineer.*\bml\b/i, /\bml\b.*engineer/i,
      /\bkünstliche[\s-]?intelligenz[\s-]?ingenieur\b/i,
    ],
  },
  {
    family: "Data Science",
    patterns: [
      /data\s*scientist/i, /datenwissenschaftler/i,
      /scientifique\s+des\s+données/i, /data\s*science\s*engineer/i,
      /\bapplied\s+scientist\b/i,
    ],
  },
  {
    family: "AI Engineering",
    patterns: [
      /\bai\s*engineer\b/i, /artificial\s*intelligence\s*engineer/i,
      /\bgen(?:erative)?[-\s]?ai\s*engineer\b/i,
      /\bllm\s*engineer\b/i, /ingénieur\s*ia\b/i,
      /ki[-\s]?ingenieur\b/i,
    ],
  },
  {
    family: "MLOps",
    patterns: [
      /\bmlops\s*engineer\b/i, /\bml\s*platform\b/i,
      /\bmodel\s*(deployment|serving|monitoring)\b/i,
    ],
  },
  {
    family: "NLP",
    patterns: [
      /\bnlp\s*engineer\b/i, /natural\s*language\s*processing\s*engineer/i,
      /\bconversational\s*ai\b/i,
    ],
  },
  {
    family: "Computer Vision",
    patterns: [
      /computer\s*vision\s*engineer/i, /\bcv\s*engineer\b/i,
      /image\s*recognition\s*engineer/i,
    ],
  },
  {
    family: "Applied Research",
    patterns: [
      /\bresearch\s*scientist\b/i, /\bapplied\s*researcher\b/i,
      /\bai\s*researcher\b/i,
    ],
  },
  {
    family: "Data Engineering",
    patterns: [
      /\bdata\s*engineer\b/i, /\bdataingenieur\b/i,
      /ingénieur\s*(?:de\s+)?données\b/i,
    ],
  },
  {
    family: "Data Analytics",
    patterns: [
      /\bdata\s*anal(?:yst|ytics)\b/i, /\bbusiness\s*intel/i,
      /\banalytics\s*engineer\b/i,
    ],
  },
];

export function classifyRole(title, description) {
  const text = `${title} ${(description || "").slice(0, 500)}`;

  for (const { family, patterns } of FAMILIES) {
    const hits = patterns.filter((p) => p.test(text));
    if (hits.length > 0) {
      // Title match = higher confidence
      const titleHit = patterns.some((p) => p.test(title));
      return {
        role_family: family,
        confidence: titleHit ? 0.92 : 0.72,
        evidence: hits.map((p) => p.toString()),
      };
    }
  }

  return { role_family: "Other / Unclear", confidence: 0.3, evidence: [] };
}
