import { sequelize } from "../db.js";
import Source from "./Source.js";
import Job from "./Job.js";
import JobClassification from "./JobClassification.js";
import JobSkill from "./JobSkill.js";
import CvDocument from "./CvDocument.js";
import CvChunk from "./CvChunk.js";

Source.hasMany(Job, { foreignKey: "source_id", onDelete: "CASCADE" });
Job.belongsTo(Source, { foreignKey: "source_id" });

Job.hasOne(JobClassification, { foreignKey: "job_id", onDelete: "CASCADE" });
JobClassification.belongsTo(Job, { foreignKey: "job_id" });

Job.hasMany(JobSkill, { foreignKey: "job_id", onDelete: "CASCADE" });
JobSkill.belongsTo(Job, { foreignKey: "job_id" });

CvDocument.hasMany(CvChunk, { foreignKey: "cv_document_id", onDelete: "CASCADE" });
CvChunk.belongsTo(CvDocument, { foreignKey: "cv_document_id" });

export async function syncModels() {
  await sequelize.sync();
}

export { Source, Job, JobClassification, JobSkill, CvDocument, CvChunk };
