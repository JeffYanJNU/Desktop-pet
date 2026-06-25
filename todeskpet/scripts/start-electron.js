const { spawn } = require("node:child_process");
const path = require("node:path");

const appDir = path.resolve(__dirname, "..");
const electronPath = require("electron");
const entryPoint = process.env.TABLEPET_DEBUG_BOOT === "1"
  ? path.join(appDir, "debug-main.js")
  : appDir;
const childEnv = { ...process.env };
delete childEnv.ELECTRON_RUN_AS_NODE;

console.log(`Starting Electron via ${electronPath}`);
console.log(`Using app entry ${entryPoint}`);

const child = spawn(electronPath, [entryPoint], {
  cwd: appDir,
  env: childEnv,
  stdio: "inherit",
  shell: false
});

child.on("error", (error) => {
  console.error("Failed to start Electron:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
