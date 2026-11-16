#!/usr/bin/env node
// TEMPLATE: scripts/sync-main.mjs (`npm run sync`; run by the SessionStart hook in .claude/settings.json)
// WHAT: bring the checkout up to date with what GitHub changed while nobody was looking: fetch, fast-forward a clean main,
//       reinstall when package-lock.json moved, and report what the Dependabot auto-merge lane did and what it left for a human.
// CHANGE: nothing.
// GUARDS: the lane merges to main on its own, so a local checkout is stale by default. Never rebases or discards local work:
//         on a feature branch it only reports. Installs with --ignore-scripts. Exits 0 always (a hook must not block a session).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { formatReport, hashText, installStale, STAMP_FILE } from "./lib/syncChecks.mjs";

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const tryRun = (cmd, args, fallback = "") => {
  try {
    return run(cmd, args);
  } catch {
    return fallback;
  }
};

const report = { merged: [], flagged: [], behind: 0, lockChanged: false, fastForwarded: 0, installed: false, offline: false };
try {
  run("git", ["fetch", "origin", "--tags", "--prune", "--quiet"]);
} catch {
  report.offline = true;
}

report.branch = tryRun("git", ["rev-parse", "--abbrev-ref", "HEAD"], "HEAD");
const dirty = tryRun("git", ["status", "--porcelain"]) !== "";
report.behind = Number(tryRun("git", ["rev-list", "--count", "HEAD..origin/main"], "0"));
report.lockChanged = tryRun("git", ["diff", "--name-only", "HEAD...origin/main", "--", "package-lock.json"]) !== "";
if (report.behind > 0 && report.branch === "main" && !dirty && tryRun("git", ["merge", "--ff-only", "--quiet", "origin/main"], "FAILED") !== "FAILED") {
  report.fastForwarded = report.behind;
  report.behind = 0;
}

const lock = existsSync("package-lock.json") ? readFileSync("package-lock.json", "utf8") : "";
const lockDirty = tryRun("git", ["status", "--porcelain", "--", "package-lock.json"]) !== "";
const stamp = existsSync(STAMP_FILE) ? readFileSync(STAMP_FILE, "utf8").trim() : "";
if (lock && !lockDirty && installStale(stamp, hashText(lock))) {
  try {
    execFileSync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { stdio: "ignore" });
    mkdirSync("node_modules", { recursive: true });
    writeFileSync(STAMP_FILE, hashText(lock));
    report.installed = true;
  } catch {
    report.flagged.push("npm ci failed after the lockfile changed: run it by hand and read the error");
  }
}

const lastStable = tryRun("git", ["tag", "--sort=-creatordate"]).split("\n").find((t) => t && !t.includes("-beta"));
const range = lastStable ? `${lastStable}..origin/main` : "origin/main";
report.merged = tryRun("git", ["log", range, "--merges", "--format=%s", "--grep=dependabot/"]).split("\n").filter(Boolean).slice(0, 10);

if (tryRun("gh", ["--version"])) {
  for (const row of tryRun("gh", ["issue", "list", "--state", "open", "--json", "number,title,labels", "--jq", '.[] | select(.labels | map(.name) | any(. == "needs-beta" or . == "automerge-broke-main" )) | "#\\(.number) \\(.title)"']).split("\n").filter(Boolean)) {
    report.flagged.push(`issue ${row}`);
  }
  for (const row of tryRun("gh", ["pr", "list", "--state", "open", "--author", "app/dependabot", "--json", "number,title", "--jq", '.[] | "PR #\\(.number) \\(.title) (the lane left it for a human)"']).split("\n").filter(Boolean)) {
    report.flagged.push(row);
  }
}

const text = formatReport(report);
if (text) console.log(text);
else console.log("sync: up to date, nothing for a human");
