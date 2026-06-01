import { createHash } from "crypto";

export function stripHtml(html) {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeHash(title, company, country) {
  const n = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const str = [n(title), n(company), (country || "").toUpperCase()].join("|");
  return createHash("sha1").update(str).digest("hex");
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
