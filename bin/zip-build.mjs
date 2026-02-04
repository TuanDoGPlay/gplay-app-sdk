import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

// =======================
// CONFIG
// =======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ APP ROOT = cwd (nơi gplay chạy)
const appRoot = process.cwd();

// ✅ Template version.json nằm trong package
const templateVersionFile = path.join(__dirname, "public", "version.json");

// ✅ Paths trong APP
const publicDir = path.join(appRoot, "public");
const publicVersionFile = path.join(publicDir, "version.json");
const distPath = path.join(appRoot, "dist");
const outputDir = path.join(appRoot, "dist-remote");
const remoteHashFile = path.join(outputDir, "hash.json");

// =======================
// HELPERS
// =======================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeReadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

// 1) Hash dist (bỏ qua version.json & hash.json)
function calculateDistHash(directory) {
  const hash = crypto.createHash("md5");

  const readDir = (dir) => {
    const files = fs.readdirSync(dir).sort();
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        readDir(filePath);
      } else {
        if (file === "version.json" || file === "hash.json") continue;
        const content = fs.readFileSync(filePath);
        hash.update(content);
      }
    }
  };

  readDir(directory);
  return hash.digest("hex");
}

// 2) bump patch
function bumpVersion(currentVer) {
  const cleanVer = currentVer?.startsWith("v") ? currentVer.substring(1) : (currentVer || "1.0.0");
  const parts = cleanVer.split(".").map((x) => Number(x));

  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) {
    console.warn(`⚠️ Version format warning: "${currentVer}". Fallback -> "${cleanVer}.1"`);
    return `${cleanVer}.1`;
  }

  parts[parts.length - 1] += 1;
  return parts.join(".");
}

// 3) đảm bảo app có public/version.json (nếu thiếu thì copy template từ package)
function ensureAppVersionFile() {
  ensureDir(publicDir);

  if (!fs.existsSync(publicVersionFile)) {
    console.log("🧩 public/version.json not found in app. Creating from package template...");

    if (fs.existsSync(templateVersionFile)) {
      fs.copyFileSync(templateVersionFile, publicVersionFile);
      console.log(`   ✅ Copied template -> ${publicVersionFile}`);
    } else {
      // fallback: tạo default nếu package cũng không có template
      const fallback = { version: "1.0.0" };
      fs.writeFileSync(publicVersionFile, JSON.stringify(fallback, null, 2));
      console.log(`   ⚠️ Template missing in package. Created default -> ${publicVersionFile}`);
    }
  }
}

// =======================
// MAIN
// =======================
console.log("🔍 Calculating build hash...");

if (!fs.existsSync(distPath)) {
  console.error('❌ Error: Folder "dist" không tồn tại. Hãy chạy "npm run build" trước!');
  process.exit(1);
}

// 1) Hash hiện tại
const currentHash = calculateDistHash(distPath);
console.log(`   Current Hash: ${currentHash}`);

// 2) Hash cũ
let oldHash = "";
if (fs.existsSync(remoteHashFile)) {
  const old = safeReadJson(remoteHashFile, {});
  if (typeof old.hash === "string") oldHash = old.hash;
  if (oldHash) console.log(`   Old Hash:     ${oldHash}`);
}

// 3) So sánh
if (currentHash === oldHash) {
  console.log("💤 No content changes detected. Skipping release.");
  process.exit(0);
}

console.log("⚡ Content changed! Preparing new release...");

// 4) đảm bảo version file tồn tại (copy từ package nếu thiếu)
ensureAppVersionFile();

// 5) đọc version cũ & bump
let versionData = safeReadJson(publicVersionFile, { version: "1.0.0" });
if (!versionData || typeof versionData !== "object") versionData = { version: "1.0.0" };
if (typeof versionData.version !== "string") versionData.version = "1.0.0";

const oldVersion = versionData.version;
const newVersion = bumpVersion(oldVersion);

console.log(`🆙 Bumping version: ${oldVersion} -> ${newVersion}`);

// update
versionData.version = newVersion;

// ghi public/version.json
fs.writeFileSync(publicVersionFile, JSON.stringify(versionData, null, 2));

// ghi dist/version.json để zip mang version mới
const distVersionFile = path.join(distPath, "version.json");
fs.writeFileSync(distVersionFile, JSON.stringify(versionData, null, 2));

// 6) output dir + meta
ensureDir(outputDir);

// lưu hash mới
fs.writeFileSync(
  remoteHashFile,
  JSON.stringify({ hash: currentHash, updated: new Date().toISOString() }, null, 2)
);

// copy version.json ra dist-remote (upload lẻ nếu cần)
fs.writeFileSync(path.join(outputDir, "version.json"), JSON.stringify(versionData, null, 2));

// 7) zip
const zipName = `${newVersion}.zip`;
const destinationZip = path.join(outputDir, zipName);

try {
  console.log(`📦 Zipping to: ${destinationZip}`);

  execSync(`npx bestzip "${destinationZip}" *`, {
    cwd: distPath, // chạy lệnh tại dist
    stdio: "inherit",
  });

  console.log("✅ RELEASE COMPLETED!");
  console.log(`   - App Root:    ${appRoot}`);
  console.log(`   - New Version: ${newVersion}`);
  console.log(`   - Zip File:    ${destinationZip}`);
} catch (e) {
  console.error("❌ Error zipping:", e);
  process.exit(1);
}
