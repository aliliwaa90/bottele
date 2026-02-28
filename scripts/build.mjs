import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const isVercel = Boolean(process.env.VERCEL);
const vercelProject = (process.env.VERCEL_PROJECT_NAME ?? "").toLowerCase();

if (!isVercel) {
  run("npx", ["turbo", "run", "build"]);
  process.exit(0);
}

if (vercelProject.includes("mini")) {
  run("npm", ["run", "build", "--workspace", "@vaulttap/mini-app"]);
  process.exit(0);
}

if (vercelProject.includes("backend")) {
  run("npm", ["run", "build", "--workspace", "@vaulttap/backend"]);
  process.exit(0);
}

if (vercelProject.includes("admin")) {
  run("npm", ["run", "build", "--workspace", "@vaulttap/admin"]);
  process.exit(0);
}

if (vercelProject.includes("-bot") || vercelProject.endsWith("bot")) {
  run("npm", ["run", "build", "--workspace", "@vaulttap/bot"]);
  process.exit(0);
}

console.warn(
  `[VaultTap] Unknown VERCEL_PROJECT_NAME="${process.env.VERCEL_PROJECT_NAME ?? ""}", building web targets only.`
);
run("npx", [
  "turbo",
  "run",
  "build",
  "--filter=@vaulttap/mini-app",
  "--filter=@vaulttap/backend",
  "--filter=@vaulttap/admin"
]);
