import { sequelize } from "../db.js";
import { DataTypes } from "sequelize";

const Application = sequelize.define(
  "Application",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    job_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    // saved | need_cv | applied | interview | offer | rejected | archived
    status: { type: DataTypes.STRING(20), defaultValue: "saved" },
    notes: { type: DataTypes.TEXT },
    applied_at: { type: DataTypes.DATE },
    follow_up_at: { type: DataTypes.DATE },
  },
  { tableName: "applications", timestamps: true, underscored: true }
);

export default Application;
