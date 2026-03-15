import { neon } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import "dotenv/config";

const globalForPrisma = globalThis;
const PRISMA_PROMISE_KEY = "__bowenPrismaPromise";

function isEdgeRuntime() {
  return (
    typeof EdgeRuntime !== "undefined" ||
    process.env.NEXT_RUNTIME === "edge" ||
    typeof WebSocketPair !== "undefined" ||
    globalThis.navigator?.userAgent === "Cloudflare-Workers"
  );
}

async function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL is missing from environment variables");
    throw new Error("DATABASE_URL is not configured");
  }

  const isEdge = isEdgeRuntime();

  if (isEdge) {
    const sql = neon(connectionString);
    const adapter = new PrismaNeon(sql);
    const { PrismaClient: PrismaClientEdge } = await import("@prisma/client/edge");
    return new PrismaClientEdge({ adapter });
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["warn", "error"],
  });
}

export async function getPrisma() {
  if (!globalForPrisma[PRISMA_PROMISE_KEY]) {
    globalForPrisma[PRISMA_PROMISE_KEY] = createPrismaClient().catch((error) => {
      delete globalForPrisma[PRISMA_PROMISE_KEY];
      throw error;
    });
  }

  return globalForPrisma[PRISMA_PROMISE_KEY];
}
