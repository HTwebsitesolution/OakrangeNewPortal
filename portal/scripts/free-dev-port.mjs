/**
 * Stops whatever is listening on port 3000 (Windows).
 * Prevents a zombie `next dev` from holding 3000 while a new dev server starts on 3003+,
 * which makes http://localhost:3000 hit the dead process and throw ENOENT for .next files.
 */
import { execFileSync } from "node:child_process";
import process from "node:process";

/** Ports a stale `next dev` may hold when 3000 is already taken (CSS/chunk 404s if you use the wrong one). */
const PORTS = [3000, 3001, 3002];

if (process.platform !== "win32") {
  console.log(
    `free-dev-port: skipped on ${process.platform}. Free ports ${PORTS.join(", ")} manually before \`next dev\`.`
  );
  process.exit(0);
}

for (const PORT of PORTS) {
  const ps = `
$ErrorActionPreference = 'SilentlyContinue'
$listeners = Get-NetTCPConnection -LocalPort ${PORT} -State Listen
if (-not $listeners) { Write-Host 'free-dev-port: port ${PORT} is free'; exit 0 }
$pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) {
  if ($p -and $p -ne $PID) {
    Write-Host ('free-dev-port: stopping PID ' + $p + ' on port ${PORT}')
    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
  }
}
`
    .trim()
    .replace(/\r?\n/g, "; ");

  try {
    execFileSync("powershell.exe", ["-NoProfile", "-Command", ps], { stdio: "inherit" });
  } catch {
    // Stop-Process / Get-NetTCPConnection may exit non-zero; ignore
  }
}
