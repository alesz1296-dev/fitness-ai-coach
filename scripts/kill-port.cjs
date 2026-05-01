// Kills whatever process is holding port 3000 before dev server starts.
// Works on Windows, macOS, and Linux.
const { execSync } = require("child_process");
const PORT = 3000;

try {
  if (process.platform === "win32") {
    // Find PID(s) listening on the port and kill them
    const result = execSync(`netstat -ano | findstr :${PORT}`, { encoding: "utf8" });
    const pids = [...new Set(
      result.split("\n")
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && /^\d+$/.test(pid) && pid !== "0")
    )];
    for (const pid of pids) {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: "pipe" }); } catch {}
    }
    if (pids.length) console.log(`[predev] Freed port ${PORT} (killed PIDs: ${pids.join(", ")})`);
  } else {
    execSync(`lsof -ti tcp:${PORT} | xargs kill -9`, { stdio: "pipe" });
  }
} catch {
  // Port wasn't in use — that's fine
}
