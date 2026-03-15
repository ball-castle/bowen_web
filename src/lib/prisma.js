import { neon, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import "dotenv/config";

const globalForPrisma = globalThis;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL is missing from environment variables");
    throw new Error("DATABASE_URL is not configured");
  }

  // Detect Cloudflare Workers / Edge environment
  const isEdge = typeof EdgeRuntime !== "undefined" || process.env.NEXT_RUNTIME === "edge";

  if (isEdge) {
    // Edge environment uses specialized client with Neon adapter
    const sql = neon(connectionString);
    const adapter = new PrismaNeon(sql);
    const { PrismaClient: PrismaClientEdge } = require("@prisma/client/edge");
    return new PrismaClientEdge({ adapter });
  }

  // Local/Node environment uses standard client with the pg adapter
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ 
    adapter,
    log: ['query', 'info', 'warn', 'error']
  });
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}
