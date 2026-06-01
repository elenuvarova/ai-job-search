import { sequelize } from "../db.js";
import { DataTypes } from "sequelize";

const Source = sequelize.define(
  "Source",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    label: { type: DataTypes.STRING(100), allowNull: false },
    attribution_html: { type: DataTypes.TEXT },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: "sources", timestamps: false, underscored: true }
);

export default Source;
