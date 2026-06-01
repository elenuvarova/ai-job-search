import { sequelize } from "../db.js";
import { DataTypes } from "sequelize";

const CvDocument = sequelize.define(
  "CvDocument",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    label: { type: DataTypes.STRING(200) },
    raw_text: { type: DataTypes.TEXT },
    char_count: { type: DataTypes.INTEGER },
  },
  { tableName: "cv_documents", timestamps: true, underscored: true }
);

export default CvDocument;
