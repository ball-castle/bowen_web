import { neon } from "@neondatabase/serverless";

const globalForRuntimeDb = globalThis;
const RUNTIME_SQL_KEY = "__bowenRuntimeSql";

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL is missing from environment variables");
    throw new Error("DATABASE_URL is not set");
  }

  return connectionString;
}

function createSqlClient() {
  return neon(getConnectionString());
}

export function getSql() {
  if (!globalForRuntimeDb[RUNTIME_SQL_KEY]) {
    globalForRuntimeDb[RUNTIME_SQL_KEY] = createSqlClient();
  }

  return globalForRuntimeDb[RUNTIME_SQL_KEY];
}

export function createRecordId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `row_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function uniqueNonEmptyValues(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}
