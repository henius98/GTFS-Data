// scripts/schedule-import.ts
import { spawn } from "node:child_process";

// run every 1h (in ms); adjust as needed
const intervalMs = 60 * 60 * 1000;

const runImport = () => {
  console.log(`[${new Date().toISOString()}] starting GTFS import...`);
  const proc = spawn("pnpm", ["run", "gtfs:import"], { stdio: "inherit", shell: true });

  proc.on("exit", (code) => {
    console.log(`[${new Date().toISOString()}] import finished with code ${code}`);
  });
};

runImport(); // kick off immediately
setInterval(runImport, intervalMs);