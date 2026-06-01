// Language requirement extractor — the core differentiator of this product.
// Rule-based extraction of which languages are required/optional, with LLM
// escalation only for genuinely ambiguous cases (unclear modifier near language mention).

const LANG_PATTERNS = {
  dutch: /\b(dutch|dutch[\s-]speaking|nederlands|néerlandais|niederländisch|hollands|flemish)\b/i,
  french: /\b(french|french[\s-]speaking|français|franstalig|Franz[oö]sisch|francophone)\b/i,
  german: /\b(german|german[\s-]speaking|deutsch|allemand|Duits)\b/i,
  luxembourgish: /\b(luxembourgish|luxembourgeois|lëtzebuergesch|luxemburgisch|letzebuerg)\b/i,
};

// Strong requirement — confident BLOCKER
const STRONG_REQUIRED = /\b(fluent|native|mother[\s-]?tongue|moedertaal|vloeiend|courant|maîtrise|parfaite\s+maîtrise|muttersprachlich|muttersprache|c1\b|b2\b|vereist|verplicht|obligatoire|erforderlich|is\s+a\s+must|notwendig|essential|strong\s+command|professional\s+proficiency|business\s+proficiency|working\s+proficiency)\b/i;

// Weaker requirement — RISK
const WEAK_REQUIRED = /\b(required|must|need(ed)?|necessary|mandatory|minimum|at\s+least)\b/i;

// Optional / nice-to-have
const OPTIONAL = /\b(plus|atout|asset|advantage|nice[\s-]?to[\s-]?have|beneficial|preferred|appreciated|wünschenswert|von\s+vorteil|een\s+plus|un\s+atout|un\s+avantage|pré\b|bonus|helpful|would\s+be|considered\s+an?)\b/i;

// Whole-text signals that English is sufficient
const ENGLISH_SUFFICIENT = /\b(english\s+is\s+sufficient|no\s+(dutch|french|german)\s+required|english[\s-]?only|english[\s-]?speaking\s+team|international\s+team|working\s+language[:\s]+english|business\s+language[:\s]+english|all[\s-]?english|team\s+language[:\s]+english)\b/i;

function getSentences(text) {
  return (text || "")
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

export function analyzeLanguageRequirements(description) {
  const text = description || "";
  const required = [];
  const optional = [];
  const evidence = [];
  const ambiguous = [];

  // Whole-text English-sufficient check
  const englishOk = ENGLISH_SUFFICIENT.test(text);

  // Sentence-level analysis
  for (const sentence of getSentences(text)) {
    for (const [lang, langRe] of Object.entries(LANG_PATTERNS)) {
      if (!langRe.test(sentence)) continue;

      const snippet = sentence.slice(0, 150);
      const isStrongRequired = STRONG_REQUIRED.test(sentence);
      const isWeakRequired = WEAK_REQUIRED.test(sentence);
      const isOptional = OPTIONAL.test(sentence);

      if (isStrongRequired && !isOptional) {
        if (!required.includes(lang)) {
          required.push(lang);
          evidence.push(`${lang} required (strong): "${snippet}"`);
        }
      } else if (isWeakRequired && !isOptional) {
        if (!required.includes(lang)) {
          required.push(lang);
          evidence.push(`${lang} required (weak): "${snippet}"`);
        }
      } else if (isOptional) {
        if (!optional.includes(lang) && !required.includes(lang)) {
          optional.push(lang);
          evidence.push(`${lang} optional: "${snippet}"`);
        }
      } else {
        // Language mentioned, modifier unclear → flag for LLM
        ambiguous.push({ lang, snippet });
        evidence.push(`${lang} mentioned (unclear): "${snippet}"`);
      }
    }
  }

  // Determine language_match
  const nonEnglishRequired = required; // all values in LANG_PATTERNS are non-English
  const hasStrongBlocker = nonEnglishRequired.some((lang) => {
    return evidence.some(
      (e) => e.startsWith(`${lang} required (strong)`)
    );
  });

  let language_match;
  let language_blocker = false;
  let confidence;
  let needs_llm = ambiguous.length > 0 && nonEnglishRequired.length === 0;

  if (englishOk && nonEnglishRequired.length === 0) {
    language_match = "good";
    language_blocker = false;
    confidence = 0.9;
    needs_llm = false;
  } else if (nonEnglishRequired.length > 0) {
    language_blocker = true;
    language_match = hasStrongBlocker ? "blocker" : "risk";
    confidence = hasStrongBlocker ? 0.88 : 0.72;
    needs_llm = false;
  } else if (optional.length > 0) {
    language_match = "maybe";
    language_blocker = false;
    confidence = 0.85;
    needs_llm = false;
  } else if (needs_llm) {
    language_match = "unknown";
    language_blocker = false;
    confidence = 0.3;
  } else {
    language_match = "good";
    language_blocker = false;
    confidence = 0.65;
  }

  return {
    required_languages: required,
    optional_languages: optional,
    language_blocker,
    language_match,
    confidence,
    evidence,
    needs_llm,
    ambiguous_snippets: ambiguous.map((a) => a.snippet),
  };
}
