import { sequelize } from "../db.js";
import { DataTypes } from "sequelize";

const Job = sequelize.define(
  "Job",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    source_id: { type: DataTypes.INTEGER, allowNull: false },
    source_job_id: { type: DataTypes.STRING(200), allowNull: false },
    title: { type: DataTypes.STRING(300), allowNull: false },
    company: { type: DataTypes.STRING(200) },
    country: { type: DataTypes.STRING(5) },
    city: { type: DataTypes.STRING(100) },
    location_raw: { type: DataTypes.STRING(300) },
    description: { type: DataTypes.TEXT },
    apply_url: { type: DataTypes.TEXT },
    posted_at: { type: DataTypes.DATE },
    raw_json: { type: DataTypes.JSON },
    dedupe_hash: { type: DataTypes.STRING(40) },
  },
  {
    tableName: "jobs",
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ["source_id", "source_job_id"] },
      { fields: ["dedupe_hash"] },
      { fields: ["country"] },
      { fields: ["posted_at"] },
    ],
  }
);

export default Job;
