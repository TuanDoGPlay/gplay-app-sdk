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
    // giữ nguyên logic của bạn nếu cần
    let code = runStep("npm", ["run", "build"], { cwd: appRoot });
    exitIfFail(code);

    const zipScript = path.join(__dirname, "zip-build.js"); // hoặc .mjs tùy bạn
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

  default:
    console.log("gplay build:remote | host-dist-remote | build:android");
    process.exit(command ? 1 : 0);
}
