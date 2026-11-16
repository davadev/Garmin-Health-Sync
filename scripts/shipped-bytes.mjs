#!/usr/bin/env node
// TEMPLATE: scripts/shipped-bytes.mjs
// WHAT: stage 1 of the Dependabot auto-merge lane (runs in the unprivileged `shipped-bytes` CI job). Builds the shipped
//       artifacts of two checkouts (main = `--base`, the PR = `--head`), builds main a second time to prove the build is
//       reproducible, and writes the SHA-256 of each artifact to `--out` as verdict.json.
// CHANGE: nothing. Artifacts and build command come from .github/automerge.json.
// GUARDS: "does this update change a byte users receive?" answered by building, not by guessing from package names.
//         The output is only a claim by code that ran inside the PR's dependency tree; the privileged stage re-checks
//         everything it can from the API and trusts only these hashes, and only when they name this PR, head and base.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const arg = (name) => process.argv[process.argv.indexOf(`--${name}`) + 1];
const config = JSON.parse(readFileSync(".github/automerge.json", "utf8"));
const [baseDir, headDir, out] = [arg("base"), arg("head"), arg("out")];

function build(dir) {
  const [cmd, ...args] = config.buildCommand.split(" ");
  const install = spawnSync("npm", ["ci", "--ignore-scripts"], { cwd: dir, stdio: "inherit" });
  if (install.status !== 0) throw new Error(`npm ci failed in ${dir}`);
  const run = spawnSync(cmd, args, { cwd: dir, stdio: "inherit" });
  if (run.status !== 0) throw new Error(`build failed in ${dir}`);
  return Object.fromEntries(config.artifacts.map((name) => [name, createHash("sha256").update(readFileSync(path.join(dir, name))).digest("hex")]));
}

const base = build(baseDir);
const head = build(headDir);
const again = build(baseDir);
const artifacts = Object.fromEntries(config.artifacts.map((name) => [name, { base: base[name], head: head[name] }]));
const deterministic = config.artifacts.every((name) => base[name] === again[name]);
writeFileSync(out, JSON.stringify({ pr: Number(arg("pr")), headSha: arg("head-sha"), baseSha: arg("base-sha"), deterministic, artifacts }, null, 2));
