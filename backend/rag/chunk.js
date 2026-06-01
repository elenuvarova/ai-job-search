// Split plain text into overlapping chunks suitable for embedding
export function chunkText(text, maxChars = 400, overlap = 60) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + maxChars, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 30) chunks.push(chunk);
    if (end >= cleaned.length) break;
    start += maxChars - overlap;
  }

  return chunks;
}
