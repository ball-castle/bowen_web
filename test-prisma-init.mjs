import "dotenv/config";
import { getPrisma } from "./src/lib/prisma.js";
import { Pool } from "@neondatabase/serverless";

async function test() {
  try {
    console.log("Checking DATABASE_URL in process.env:", process.env.DATABASE_URL ? "Exists" : "MISSING");
    
    console.log("Attempting to get Prisma instance...");
    const prisma = getPrisma();
    console.log("Instance obtained. Searching for avatar_chosen.png...");
    const matchedPhotos = await prisma.photo.findMany({
      where: {
        OR: [
          { title: { contains: 'avatar_chosen.png' } },
          { url: { contains: 'avatar_chosen.png' } }
        ]
      }
    });
    console.log("Matched photos found:", matchedPhotos.length);
    if (matchedPhotos.length > 0) {
      console.log("Matches:", JSON.stringify(matchedPhotos, null, 2));
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

test();
