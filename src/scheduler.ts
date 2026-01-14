// scripts/schedule-import.ts
import { spawn } from "node:child_process";

// run every 1h (in ms); adjust as needed
const intervalMs = 60 * 60 * 1000;
let isRunning = false;

const runImport = () => {
  if (isRunning) {
    console.log(
      `[${new Date().toISOString()}] previous import still running; skipping`
    );
    return;
  }

  isRunning = true;
  console.log(`[${new Date().toISOString()}] starting GTFS import...`);
  const proc = spawn("pnpm", ["run", "gtfs:import"], { stdio: "inherit", shell: true });

  proc.on("exit", (code) => {
    console.log(`[${new Date().toISOString()}] import finished with code ${code}`);
    isRunning = false;
  });

  proc.on("error", (err) => {
    console.error(`[${new Date().toISOString()}] import failed to start`, {
      error: err.message
    });
    isRunning = false;
  });
};

runImport(); // kick off immediately
setInterval(runImport, intervalMs);
