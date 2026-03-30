import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

// export const pool = mysql.createPool({
//   uri: databaseUrl,
//   waitForConnections: true,
// });
const globalForDb = globalThis as typeof globalThis & {
  mysqlPool?: mysql.Pool;
};

export const pool =
  globalForDb.mysqlPool ??
  mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60_000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.mysqlPool = pool;
}

export const db = drizzle(pool);
