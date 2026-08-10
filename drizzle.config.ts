import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    // T-069: the app DB lives in the browser; db:push/db:studio operate on
    // the script-side tool DB or any exported save snapshot via DB_PATH.
    url: process.env.DB_PATH ?? "./data/app.db",
  },
});
