import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  // Detect Cloudflare Workers / Edge environment
  const isEdge = typeof EdgeRuntime !== "undefined" || process.env.NEXT_RUNTIME === "edge";

  if (isEdge) {
    // Edge environment uses specialized adapter
    const { PrismaClient: PrismaClientEdge } = require("@prisma/client/edge");
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClientEdge({ adapter });
  }

  // Local/Node environment uses standard client
  return new PrismaClient();
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}
