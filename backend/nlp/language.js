import { franc } from "franc-min";

const FRANC_MAP = {
  nld: "dutch",
  fra: "french",
  deu: "german",
  eng: "english",
  afr: "dutch", // Afrikaans — rare, treat as Dutch
};

// Keyword fallback for short texts where franc is unreliable
const SHORT_TEXT_MARKERS = [
  { lang: "dutch", re: /\b(vacature|solliciteer|werkgever|voltijds|wij zoeken|jij hebt|omschrijving|ervaring|vereist)\b/i },
  { lang: "french", re: /\b(offre d'emploi|nous recherchons|rejoignez|vous avez|poste|CDI|CDD|rémunération|compétences)\b/i },
  { lang: "german", re: /\b(wir suchen|Stellenangebot|Kenntnisse|Erfahrung|Festanstellung|Vollzeit|Gehalt|bewerben)\b/i },
];

export function detectLanguage(text) {
  if (!text) return "unknown";

  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length < 80) {
    for (const { lang, re } of SHORT_TEXT_MARKERS) {
      if (re.test(cleaned)) return lang;
    }
    return "english";
  }

  const code = franc(cleaned.slice(0, 1500), { minLength: 10 });
  return FRANC_MAP[code] || "other";
}
