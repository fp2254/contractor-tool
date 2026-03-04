#!/usr/bin/env node
// Clears port 5000 using /proc filesystem, then starts Next.js dev server
const fs = require("fs");
const { spawn } = require("child_process");

const PORT = 5000;
const PORT_HEX = PORT.toString(16).toUpperCase().padStart(4, "0");

function clearPort() {
  const socketInodes = new Set();
  for (const netFile of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    try {
      const lines = fs.readFileSync(netFile, "utf8").split("\n").slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 10) continue;
        const localPort = (parts[1] || "").split(":")[1];
        const state = parts[3];
        if (localPort && localPort.toUpperCase() === PORT_HEX && state === "0A") {
          socketInodes.add(parts[9]);
        }
      }
    } catch {}
  }

  if (socketInodes.size === 0) return;

  const pids = new Set();
  try {
    for (const pid of fs.readdirSync("/proc").filter((d) => /^\d+$/.test(d))) {
      try {
        for (const fd of fs.readdirSync(`/proc/${pid}/fd`)) {
          try {
            const link = fs.readlinkSync(`/proc/${pid}/fd/${fd}`);
            const m = link.match(/socket:\[(\d+)\]/);
            if (m && socketInodes.has(m[1])) pids.add(parseInt(pid, 10));
          } catch {}
        }
      } catch {}
    }
  } catch {}

  for (const pid of pids) {
    if (pid === process.pid) continue;
    try {
      process.kill(pid, "SIGKILL");
      console.log(`[start] Cleared stale process PID ${pid} from port ${PORT}`);
    } catch {}
  }
}

clearPort();

setTimeout(() => {
  const child = spawn(
    "npm",
    ["run", "dev", "--", "-H", "0.0.0.0", "-p", String(PORT)],
    { stdio: "inherit", shell: false }
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}, 500);
