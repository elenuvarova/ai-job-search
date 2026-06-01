import { Router } from "express";
import { Job, JobClassification, JobSkill, CvDocument } from "../models/index.js";
import { embed } from "../rag/embed.js";
import { retrieveTopChunks } from "../rag/retrieve.js";
import { runAssistant } from "../rag/assistant.js";

const router = Router();
const ACTIONS = ["tailor-cv", "cover-letter", "interview-prep"];

// POST /api/jobs/:id/:action
// action = tailor-cv | cover-letter | interview-prep
router.post("/:jobId/:action", async (req, res) => {
  const { jobId, action } = req.params;
  if (!ACTIONS.includes(action)) {
    return res.status(400).json({ error: `Unknown action. Use: ${ACTIONS.join(", ")}` });
  }

  try {
    // Load job with classification and skills
    const job = await Job.findByPk(jobId, {
      include: [
        { model: JobClassification, required: false },
        { model: JobSkill, required: false },
      ],
    });
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Load latest CV
    const cv = await CvDocument.findOne({ order: [["created_at", "DESC"]] });
    if (!cv) return res.status(400).json({ error: "No CV uploaded yet. Upload a CV first." });

    // Build retrieval query from job data
    const skills = (job.JobSkills || []).map((s) => s.skill).join(" ");
    const query = `${job.title} ${job.JobClassification?.role_family || ""} ${skills}`.trim();

    // Embed query + retrieve top CV chunks
    const queryEmbedding = await embed(query);
    const chunks = await retrieveTopChunks(cv.id, queryEmbedding, 5);

    // Run assistant
    const result = await runAssistant(action, job, chunks, job.description);

    res.json({ action, result });
  } catch (err) {
    console.error(`RAG ${action} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
