import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import process from "node:process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

if (process.platform === "win32") {
  try {
    execFileSync("node", [resolve(root, "scripts/free-dev-port.mjs")], { stdio: "inherit" });
  } catch {
    // free-dev-port may exit non-zero; continue cleanup
  }
}

console.log(
  "Cleaning .next — stop any extra `next dev` terminals if removal fails (EBUSY/EPERM)."
);

const dirs = [".next", "node_modules/.cache"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rmWithRetries(absPath, label) {
  if (!existsSync(absPath)) {
    console.log("Skip (missing):", label);
    return;
  }
  const max = 6;
  for (let i = 0; i < max; i++) {
    try {
      await rm(absPath, { recursive: true, force: true });
      console.log("Removed:", label);
      return;
    } catch (e) {
      const code = /** @type {NodeJS.ErrnoException} */ (e).code;
      if (i === max - 1) {
        console.error(`Failed to remove ${label} after ${max} tries:`, e);
        process.exitCode = 1;
        return;
      }
      if (code === "EBUSY" || code === "EPERM" || code === "ENOTEMPTY") {
        console.warn(
          `${label}: ${code}, retry ${i + 1}/${max - 1} (stop all \`next dev\` / Node processes using this folder, then retry)…`
        );
        await sleep(400 * (i + 1));
        continue;
      }
      throw e;
    }
  }
}

for (const rel of dirs) {
  await rmWithRetries(resolve(root, rel), rel);
}
