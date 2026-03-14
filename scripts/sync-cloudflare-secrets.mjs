import "dotenv/config";

import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const REQUIRED_SECRET_KEYS = [
  "DATABASE_URL",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "SESSION_SECRET",
];

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");

function getEnvValue(name) {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getMissingKeys() {
  return REQUIRED_SECRET_KEYS.filter((key) => !getEnvValue(key));
}

function getWorkerName() {
  const wranglerPath = path.join(process.cwd(), "wrangler.json");
  const config = JSON.parse(readFileSync(wranglerPath, "utf8"));

  if (!config.name || typeof config.name !== "string") {
    throw new Error("wrangler.json is missing a valid worker name");
  }

  return config.name;
}

function putSecret(workerName, key, value) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["wrangler", "secret", "put", key, "--name", workerName],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["pipe", "inherit", "inherit"],
      }
    );

    child.stdin.write(value);
    child.stdin.end();

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`wrangler secret put ${key} failed with exit code ${code}`));
    });
  });
}

async function main() {
  const workerName = getWorkerName();
  const missingKeys = getMissingKeys();

  if (missingKeys.length > 0) {
    throw new Error(`Missing required env keys: ${missingKeys.join(", ")}`);
  }

  if (isDryRun) {
    console.log(`Dry run for worker: ${workerName}`);
    for (const key of REQUIRED_SECRET_KEYS) {
      console.log(`Would upload secret: ${key}`);
    }
    return;
  }

  console.log(`Uploading secrets to worker: ${workerName}`);

  for (const key of REQUIRED_SECRET_KEYS) {
    await putSecret(workerName, key, getEnvValue(key));
    console.log(`Uploaded: ${key}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
