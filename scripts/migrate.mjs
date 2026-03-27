import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

console.log("Connecting to database...");

const connection = await mysql.createConnection(connectionString);
const db = drizzle(connection);

console.log("Running migrations...");

try {
  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, "../drizzle"),
  });
  console.log("✅ Migrations completed successfully!");
} catch (error) {
  console.error("❌ Migration failed:", error.message);
  console.error(error);
  process.exit(1);
} finally {
  await connection.end();
}
