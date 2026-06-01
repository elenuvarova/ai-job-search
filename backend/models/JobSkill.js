import { sequelize } from "../db.js";
import { DataTypes } from "sequelize";

const JobSkill = sequelize.define(
  "JobSkill",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    job_id: { type: DataTypes.INTEGER, allowNull: false },
    skill: { type: DataTypes.STRING(100), allowNull: false },
    // 'matched' | 'gap'
    skill_type: { type: DataTypes.STRING(20) },
    confidence: { type: DataTypes.FLOAT },
  },
  {
    tableName: "job_skills",
    timestamps: false,
    underscored: true,
    indexes: [{ fields: ["job_id"] }, { fields: ["skill"] }],
  }
);

export default JobSkill;
