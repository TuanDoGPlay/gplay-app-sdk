#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { buildAndroid } from './build-android.mjs'

function runStep(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, ...opts });
  return r.status ?? 1;
}

function exitIfFail(code) {
  if (code !== 0) process.exit(code);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFileEnsured(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// appRoot = nơi bạn đứng trong project app khi gõ `gplay ...`
const appRoot = process.cwd();

const [, , command, ...rest] = process.argv;

switch (command) {
  case "build:remote": {
    let code = runStep("npm", ["run", "build"], { cwd: appRoot });
    exitIfFail(code);

    const zipScript = path.join(__dirname, "zip-build.js");
    code = runStep("node", [zipScript, ...rest], { cwd: appRoot });
    process.exit(code);
  }

  case "host-dist-remote": {
    const serverFile = path.join(__dirname, "host-dist-remote.mjs");
    const code = runStep("node", [serverFile, ...rest], { cwd: appRoot });
    process.exit(code);
  }

  case "build:android":
    await buildAndroid({ appRoot, pkgRoot: __dirname, rest });
    break;

    case "build:dev": {
      const urlIdx = rest.indexOf("--url");
      const serverUrl = (urlIdx !== -1 && rest[urlIdx + 1]) ? rest[urlIdx + 1] : null;

      if (!serverUrl) {
        console.error("❌ Thiếu --url. Dùng: npx gplay build:dev --url http://192.168.x.x:4000");
        process.exit(1);
      }

      const filteredRest = rest.filter((_, i) => i !== urlIdx && i !== urlIdx + 1);
      await buildAndroid({ appRoot, pkgRoot: __dirname, rest: filteredRest, skipBump: true, serverUrl });
      break;
    }

  default:
    console.log("gplay build:remote | host-dist-remote | build:android | build:dev");
    process.exit(command ? 1 : 0);
}
