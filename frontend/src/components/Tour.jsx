import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "scout_tour_done";

const STEPS = [
  {
    target: null,
    title: "Welcome to your Job Scout",
    body: "Your personal radar for ML, Data Science & AI roles in Belgium, Netherlands and Luxembourg. A 4-step tour to get you started.",
  },
  {
    target: "[data-tour='filters']",
    title: "Smart filters",
    body: "Filter by country, language, employment type and remote. Results update instantly — no submit button needed.",
  },
  {
    target: "[data-tour='lang-badge']",
    title: "The language badge",
    body: "The most important signal. Green = English only. Yellow = a second language is preferred but optional. Red = Dutch/French/German/Luxembourgish is required — a likely blocker.",
  },
  {
    target: "[data-tour='first-card']",
    title: "Job cards",
    body: "Shows role family, seniority, employment type and remote. Click — or press Enter — to see the full description, detected skills, and language analysis.",
  },
  {
    target: null,
    title: "You're all set",
    body: "Jobs are collected daily at 6:17 AM. Try the \"✓ English OK\" language filter to see only English-friendly roles. Happy hunting.",
  },
];

export default function Tour({ onDone }) {
  const [step, setStep] = useState(0);
  const panelRef = useRef(null);
  const triggerRef = useRef(null); // element focused before the tour opened

  const highlight = useCallback((targetSelector) => {
    // Remove previous highlight
    document.querySelectorAll(".tour-highlighted").forEach((el) =>
      el.classList.remove("tour-highlighted")
    );
    if (!targetSelector) return;

    const el = document.querySelector(targetSelector);
    if (!el) return;

    el.classList.add("tour-highlighted");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(() => {
    highlight(STEPS[step].target);
    return () => highlight(null);
  }, [step, highlight]);

  const finish = useCallback(() => {
    highlight(null);
    localStorage.setItem(STORAGE_KEY, "1");
    onDone();
    // Restore focus to the "? Tour" trigger (the canonical opener) AFTER React
    // has unmounted the dialog, so the focus call isn't undone.
    const back = document.getElementById("tour-trigger") || triggerRef.current;
    requestAnimationFrame(() => back?.focus?.());
  }, [highlight, onDone]);

  // On open: remember the trigger, move focus into the panel, and trap Tab.
  useEffect(() => {
    triggerRef.current = document.activeElement;
    const panel = panelRef.current;
    panel?.querySelector(".tour-btn-primary")?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll(
        'button, a[href], input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [finish]);

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const current = STEPS[step];

  return (
    <div
      className="tour-panel"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="tour-dots" aria-hidden="true">
        {STEPS.map((_, i) => (
          <div key={i} className={`tour-dot ${i === step ? "active" : ""}`} />
        ))}
      </div>

      <h2 id="tour-title" className="tour-title">{current.title}</h2>
      <div className="tour-body">{current.body}</div>

      <div className="tour-actions">
        <button className="tour-skip" onClick={finish}>
          Skip tour
        </button>
        {step > 0 && (
          <button className="tour-btn" onClick={prev}>
            ← Back
          </button>
        )}
        <button className="tour-btn tour-btn-primary" onClick={next}>
          {step === STEPS.length - 1 ? "Done ✓" : "Next →"}
        </button>
      </div>
    </div>
  );
}

export function shouldShowTour() {
  return !localStorage.getItem(STORAGE_KEY);
}
