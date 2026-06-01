// Multilingual employment-type classifier — rule-based, no API calls

const FULL_TIME = [
  /\bfull[-\s]?time\b/i, /\bpermanent\b/i,
  /\bCDI\b/, /\bcontrat à durée indéterminée\b/i,
  /\bvast(e)?\s+(contract|dienstverband|baan)\b/i, /\bvoltijds\b/i,
  /\bonbepaalde\s+tijd\b/i, /\bFestanstellung\b/i, /\bunbefrist/i, /\bVollzeit\b/i,
  /\bindefinite\s+contract\b/i, /\bemployee\b/i,
];

const CONTRACT = [
  /\bcontract(or)?\b/i, /\bfreelance\b/i, /\bproject[-\s]?based\b/i,
  /\bconsulting\s+(role|position|assignment)\b/i, /\binterim\b/i,
  /\btemporary\b/i, /\b\d+[-\s]month/i, /\bdaily\s+rate\b/i,
  /\brate\s+per\s+day\b/i, /\bzzp\b/i, /\bdetachering\b/i,
  /\bopdracht\b/i, /\btijdelijk\b/i, /\bCDD\b/,
  /\bcontrat à durée déterminée\b/i, /\btaux journalier\b/i,
  /\bmission\s+(freelance|consulting)\b/i, /\bfreiberuflich\b/i,
  /\bbefristet\b/i, /\bProjektvertrag\b/i, /\bTagessatz\b/i,
];

export function classifyEmployment(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  const ftScore = FULL_TIME.filter((p) => p.test(text)).length;
  const ctScore = CONTRACT.filter((p) => p.test(text)).length;

  if (ftScore === 0 && ctScore === 0) {
    return { employment_type: "unclear", confidence: 0, evidence: [] };
  }

  const total = ftScore + ctScore;
  if (ftScore >= ctScore) {
    return {
      employment_type: "full_time",
      confidence: Math.min(0.95, 0.5 + ftScore / total),
      evidence: FULL_TIME.filter((p) => p.test(text)).map((p) => p.toString()),
    };
  }
  return {
    employment_type: "contract",
    confidence: Math.min(0.95, 0.5 + ctScore / total),
    evidence: CONTRACT.filter((p) => p.test(text)).map((p) => p.toString()),
  };
}
