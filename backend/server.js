import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { sequelize, dbKind } from "./db.js";
import { syncModels } from "./models/index.js";
import jobsRouter from "./routes/jobs.js";
import collectRouter from "./routes/collect.js";
import classifyRouter from "./routes/classify.js";
import cvRouter from "./routes/cv.js";
import ragRouter from "./routes/rag.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: "ok", db: dbKind });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the backend 👋" });
});

app.use("/api/jobs", jobsRouter);
app.use("/api/collect", collectRouter);
app.use("/api/classify", classifyRouter);
app.use("/api/cv", cvRouter);
app.use("/api/jobs", ragRouter);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "public")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });
}

await syncModels();

app.listen(PORT, () => {
  console.log(`db: ${dbKind}`);
  console.log(`Server listening on port ${PORT}`);
});
