import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function runStep(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, ...opts });
  return r.status ?? 1;
}

function exitIfFail(code, msg) {
  if (code !== 0) {
    if (msg) console.error(msg);
    process.exit(code);
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFileEnsured(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function readArgValue(argv, name) {
  const idx = argv.indexOf(name);
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
  return null;
}

function hasAnyFile(appRoot, names) {
  return names.some((n) => fs.existsSync(path.join(appRoot, n)));
}

function detectPM(appRoot) {
  if (fs.existsSync(path.join(appRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(appRoot, "yarn.lock"))) return "yarn";
  return "npm";
}

function installCmd(pm, { dev, pkgs }) {
  // returns [cmd, args]
  if (pm === "pnpm") {
    return ["pnpm", ["add", dev ? "-D" : "", ...pkgs].filter(Boolean)];
  }
  if (pm === "yarn") {
    // yarn classic / berry đều nhận add -D
    return ["yarn", ["add", dev ? "-D" : "", ...pkgs].filter(Boolean)];
  }
  // npm
  return ["npm", ["i", dev ? "-D" : "", ...pkgs].filter(Boolean)];
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function normalizeAppId(appName) {
  const slug = (appName || "app")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 30);
  return `com.example.${slug || "app"}`;
}

function ensureCapacitorDeps(appRoot) {
  const pkgPath = path.join(appRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.error(`[gplay build:android] package.json not found in app root: ${appRoot}`);
    process.exit(1);
  }

  const pkg = readJSON(pkgPath);
  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};

  const needCli = !devDeps["@capacitor/cli"] && !deps["@capacitor/cli"];
  const needCore = !deps["@capacitor/core"] && !devDeps["@capacitor/core"];
  const needAndroid = !deps["@capacitor/android"] && !devDeps["@capacitor/android"];

  if (!needCli && !needCore && !needAndroid) return;

  const pm = detectPM(appRoot);

  if (needCli) {
    console.log("[gplay build:android] Installing @capacitor/cli (dev) ...");
    const [cmd, args] = installCmd(pm, { dev: true, pkgs: ["@capacitor/cli"] });
    exitIfFail(runStep(cmd, args, { cwd: appRoot }), "[gplay build:android] install @capacitor/cli failed");
  }

  const toInstall = [];
  if (needCore) toInstall.push("@capacitor/core");
  if (needAndroid) toInstall.push("@capacitor/android");

  if (toInstall.length) {
    console.log(`[gplay build:android] Installing ${toInstall.join(", ")} ...`);
    const [cmd, args] = installCmd(pm, { dev: false, pkgs: toInstall });
    exitIfFail(runStep(cmd, args, { cwd: appRoot }), "[gplay build:android] install capacitor deps failed");
  }
}

function ensureCapacitorInit(appRoot, argv) {
  // capacitor config có thể là json/ts
  const hasConfig = hasAnyFile(appRoot, [
    "capacitor.config.json",
    "capacitor.config.ts",
    "capacitor.config.js",
  ]);
  if (hasConfig) return;

  const appNameArg = readArgValue(argv, "--appName");
  const appIdArg = readArgValue(argv, "--appId");

  const appName = appNameArg || path.basename(appRoot);
  const appId = appIdArg || normalizeAppId(appName);

  console.log(`[gplay build:android] capacitor config not found -> init (appName="${appName}", appId="${appId}")`);
  const code = runStep("npx", ["cap", "init", appName, appId], { cwd: appRoot });
  exitIfFail(code, "[gplay build:android] cap init failed");
}

function ensureAndroidPlatform(appRoot, packageRoot) {
  const androidDir = path.join(appRoot, "android");
  if (fs.existsSync(androidDir)) return false; // not newly created

  console.log("[gplay build:android] android/ not found -> npx cap add android");
  let code = runStep("npx", ["cap", "add", "android"], { cwd: appRoot });
  exitIfFail(code, "[gplay build:android] cap add android failed");

  // copy manifest template from package -> app
  const manifestTemplate = path.join(packageRoot, "android", "app", "src", "main", "AndroidManifest.xml");
  const manifestDest = path.join(appRoot, "android", "app", "src", "main", "AndroidManifest.xml");

  if (!fs.existsSync(manifestTemplate)) {
    console.error(
      `[gplay build:android] Missing manifest template in package:\n  ${manifestTemplate}\n` +
      `Please ensure your package contains: android/app/src/main/AndroidManifest.xml`
    );
    process.exit(1);
  }

  console.log("[gplay build:android] Copying AndroidManifest.xml from package -> app...");
  copyFileEnsured(manifestTemplate, manifestDest);
  console.log(`  ✅ ${manifestDest}`);

  return true; // newly created
}

export async function buildAndroid({ appRoot, pkgRoot, rest = [] }) {
  // pkgRoot bạn truyền vào thường là __dirname của bin/
  const packageRoot = path.resolve(pkgRoot, "..");

  // 1) npm run build (ở app)
  console.log("[gplay build:android] 1/4 Building web...");
  exitIfFail(runStep("npm", ["run", "build"], { cwd: appRoot }), "[gplay build:android] npm run build failed");

  // 2) ensure capacitor deps
  console.log("[gplay build:android] 2/4 Ensuring Capacitor deps...");
  ensureCapacitorDeps(appRoot);

  // 3) ensure cap init (capacitor.config.*)
  console.log("[gplay build:android] 3/4 Ensuring Capacitor init...");
  ensureCapacitorInit(appRoot, rest);

  // 4) ensure android platform + manifest template (only when android/ does not exist)
  console.log("[gplay build:android] 4/4 Ensuring Android platform...");
  ensureAndroidPlatform(appRoot, packageRoot);

  // 5) sync android
  console.log("[gplay build:android] Syncing Android...");
  const code = runStep("npx", ["cap", "sync", "android", ...rest], { cwd: appRoot });
  process.exit(code);
}
