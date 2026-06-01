// Dialect is picked from DATABASE_URL so the same config works locally (SQLite)
// and on Render (Postgres) without any code changes.
import { Sequelize } from "sequelize";

let sequelize;
let dbKind;

const url = process.env.DATABASE_URL || "";

if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
  dbKind = "postgres";
  sequelize = new Sequelize(url, {
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else {
  dbKind = "sqlite";
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: process.env.SQLITE_PATH || "./data.sqlite",
    logging: false,
  });
}

export { sequelize, dbKind };
