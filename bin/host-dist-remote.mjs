import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

function readArgValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

const PORT = Number(readArgValue("--port") || process.env.PORT || 8080);
const HOST = readArgValue("--host") || process.env.HOST || "0.0.0.0";

// APP root = cwd lúc chạy lệnh
const appRoot = process.cwd();

// ✅ target: dist-remote của APP
const appDistRemote = path.resolve(
  readArgValue("--dir") || process.env.DIST_REMOTE_DIR || path.join(appRoot, "dist-remote")
);

// ✅ source: dist-remote của SDK (tính theo vị trí file script này trong node_modules/gplay-app-sdk/bin)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sdkDistRemote = path.resolve(path.join(__dirname, "../dist-remote"));

// ---- copy helpers ----
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return false;

  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

// ---- ensure dist-remote exists ----
if (!fs.existsSync(appDistRemote)) {
  console.log(`ℹ️  dist-remote not found in app: ${appDistRemote}`);
  console.log(`➡️  Copying from SDK: ${sdkDistRemote}`);

  const ok = copyDirRecursive(sdkDistRemote, appDistRemote);

  if (!ok) {
    console.error(`❌ SDK dist-remote not found: ${sdkDistRemote}`);
    console.error(
      `Tip: Ensure SDK publishes dist-remote (add it to "files"), or build remote to create app/dist-remote first.`
    );
    process.exit(1);
  }

  console.log(`✅ Copied SDK dist-remote -> app/dist-remote`);
}

// --- host ---
const distPath = appDistRemote;

const app = express();

// CORS hard-set cho mọi response
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static
app.use(express.static(distPath, { index: false, extensions: false }));

// 404
app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, HOST, () => {
  console.log("--- SERVER MODULE STARTED ---");
  console.log(`➜ Local:   http://localhost:${PORT}`);
  console.log(`➜ Host:    http://${HOST}:${PORT}`);
  console.log(`➜ Folder:  ${distPath}`);
});
