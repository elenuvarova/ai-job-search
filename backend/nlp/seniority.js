const PATTERNS = [
  { level: "intern", re: /\b(intern|internship|stage|stagaire|praktikum|werkstudent)\b/i },
  { level: "junior", re: /\b(junior|jr\.?|entry[\s-]?level|0[-–]2\s*year|starting)\b/i },
  { level: "senior", re: /\b(senior|sr\.?|principal|staff\s+\w+\s*engineer|lead\s+\w+\s*engineer|expert)\b/i },
  { level: "lead", re: /\b(lead|tech\s+lead|engineering\s+manager|head\s+of|director|vp\s+of|team\s+lead)\b/i },
];

const MID_RE = /\b(medior|mid[-\s]?level|mid[-\s]?senior|(\d+)[\+\-–]\s*years?\s*(of\s*)?experience)\b/i;

export function classifySeniority(title, description) {
  const text = `${title} ${(description || "").slice(0, 300)}`;

  // lead and senior first (highest specificity)
  for (const { level, re } of PATTERNS.slice().reverse()) {
    if (re.test(text)) return { seniority: level, evidence: re.toString() };
  }

  if (MID_RE.test(text)) return { seniority: "mid", evidence: MID_RE.toString() };

  return { seniority: "unknown", evidence: null };
}
