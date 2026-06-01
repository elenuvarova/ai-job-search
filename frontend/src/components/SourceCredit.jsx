const SOURCE_URLS = {
  adzuna:   "https://www.adzuna.com",
  arbeitnow:"https://www.arbeitnow.com",
  remotive: "https://remotive.com",
  muse:     "https://www.themuse.com",
};

const SOURCE_LABELS = {
  adzuna:   "Jobs by Adzuna",
  arbeitnow:"via Arbeitnow",
  remotive: "via Remotive",
  muse:     "via The Muse",
};

export default function SourceCredit({ source }) {
  if (!source) return null;
  const url = SOURCE_URLS[source.key] || "#";
  const label = SOURCE_LABELS[source.key] || source.label;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="source-link"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </a>
  );
}
