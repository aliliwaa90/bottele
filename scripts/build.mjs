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
const forcedTarget = (process.env.VT_DEPLOY_TARGET ?? "").toLowerCase();
const cwd = process.cwd().replace(/\\/g, "/").toLowerCase();
const isVercelDetected =
  isVercel ||
  cwd.includes("/vercel/path0") ||
  Boolean(process.env.VERCEL_URL) ||
  Boolean(process.env.VERCEL_REGION);
const deployTarget = forcedTarget || vercelProject;

if (!isVercelDetected) {
  run("npx", ["turbo", "run", "build"]);
  process.exit(0);
}

if (deployTarget.includes("mini")) {
  run("npm", ["run", "build", "--workspace", "@vaulttap/mini-app"]);
  process.exit(0);
}

if (deployTarget.includes("backend")) {
  run("npm", ["run", "build", "--workspace", "@vaulttap/backend"]);
  process.exit(0);
}

if (deployTarget.includes("admin")) {
  run("npm", ["run", "build", "--workspace", "@vaulttap/admin"]);
  process.exit(0);
}

if (deployTarget.includes("-bot") || deployTarget.endsWith("bot") || deployTarget === "bot") {
  run("npm", ["run", "build", "--workspace", "@vaulttap/bot"]);
  process.exit(0);
}

if (deployTarget === "bottele" || deployTarget === "vaulttap") {
  run("npm", ["run", "build", "--workspace", "@vaulttap/mini-app"]);
  process.exit(0);
}

console.warn(
  `[VaultTap] Unknown deploy target (VT_DEPLOY_TARGET="${forcedTarget}", VERCEL_PROJECT_NAME="${process.env.VERCEL_PROJECT_NAME ?? ""}"), building web targets only.`
);
run("npm", ["run", "build", "--workspace", "@vaulttap/mini-app"]);
