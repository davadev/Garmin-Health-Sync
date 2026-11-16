#!/usr/bin/env node
// TEMPLATE: scripts/automerge-policy.mjs
// WHAT: stage 2 of the Dependabot auto-merge lane (runs in the privileged workflow, on trusted code from the default
//       branch, never on a checkout of the PR). Gathers the facts about one PR from the GitHub API, hands them to
//       scripts/lib/automergePolicy.mjs and acts on the verdict: merge, label + issue, or just comment.
// CHANGE: nothing. Knobs live in .github/automerge.json (`dryRun: true` comments the verdict and never merges).
// GUARDS: the PR's own files are read through the API at the exact head commit, never executed; the merge is pinned to
//         that commit (`--match-head-commit`), so a push after the check cannot ride along.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { checkNpmrc } from "./lib/supplyChainChecks.mjs";
import { evaluate } from "./lib/automergePolicy.mjs";

const arg = (name) => process.argv[process.argv.indexOf(`--${name}`) + 1];
const repo = process.env.GITHUB_REPOSITORY;
const number = Number(arg("pr"));
const config = JSON.parse(readFileSync(".github/automerge.json", "utf8"));

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const api = (route, ...extra) => JSON.parse(gh("api", route, ...extra));
const raw = (file, ref) => JSON.parse(gh("api", `repos/${repo}/contents/${file}?ref=${ref}`, "-H", "Accept: application/vnd.github.raw+json"));

const pr = api(`repos/${repo}/pulls/${number}`);
const base = api(`repos/${repo}/git/ref/heads/main`).object.sha;
const files = api(`repos/${repo}/pulls/${number}/files?per_page=100`);
const runs = api(`repos/${repo}/commits/${pr.head.sha}/check-runs?per_page=100`).check_runs;
const paused = api(`repos/${repo}/issues?labels=automerge-broke-main&state=open`).length > 0;
const verdict = (() => {
  try {
    return JSON.parse(readFileSync(arg("verdict"), "utf8"));
  } catch {
    return undefined;
  }
})();

const basePackage = raw("package.json", base);
const headPackage = raw("package.json", pr.head.sha);
const baseLock = raw("package-lock.json", base);
const headLock = raw("package-lock.json", pr.head.sha);

const readText = (file) => {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
};
const repoFacts = {
  minReleaseAge: checkNpmrc(readText(".npmrc")).ok,
  cooldown: /^\s*cooldown:/m.test(readText(".github/dependabot.yml") ?? ""),
  scriptsAllowed: Object.values(headPackage.allowScripts ?? {}).some((v) => v === true),
};

// Age of each version the PR adopts, from the registry's publish times (metadata only; nothing is installed).
const ages = {};
for (const [path, entry] of Object.entries(headLock.packages)) {
  if (path === "" || JSON.stringify(baseLock.packages[path]) === JSON.stringify(entry)) continue;
  const name = entry.name ?? path.slice(path.lastIndexOf("node_modules/") + 13);
  try {
    const time = JSON.parse(execFileSync("npm", ["view", `${name}@${entry.version}`, "time", "--json"], { encoding: "utf8" }));
    const published = time[entry.version] ?? Object.values(time).at(-1);
    ages[`${name}@${entry.version}`] = (Date.now() - Date.parse(published)) / 86400000;
  } catch {
    /* unknown age: the policy treats it as a reason to skip */
  }
}

// GITHUB_TOKEN cannot read Dependabot alerts (HTTP 403), so "security" comes from the PR itself: Dependabot labels its security
// updates `security` and states the severity in the body. A security PR without a readable severity counts as `high`
// (3 days of age, never the 0-day critical shortcut).
const isSecurity = (pr.labels ?? []).some((l) => l.name === "security");
const severity = (/severity[^a-z]{0,20}(critical|high|moderate|medium|low)/i.exec(pr.body ?? "")?.[1] ?? "high").toLowerCase();
const alerts = isSecurity
  ? Object.entries(headLock.packages)
      .filter(([path, entry]) => path !== "" && JSON.stringify(baseLock.packages[path]) !== JSON.stringify(entry))
      .map(([path, entry]) => ({ name: entry.name ?? path.slice(path.lastIndexOf("node_modules/") + 13), severity, patched: entry.version }))
  : [];

const result = evaluate({ config, repo, pr, files, basePackage, headPackage, baseLock, headLock, runs, verdict, baseSha: base, alerts, ages, repoFacts, paused });
const lines = result.changes.map((c) => `- \`${c.name}\` ${c.from ?? "new"} -> ${c.to}`).join("\n");
const why = result.reasons.map((r) => `- ${r}`).join("\n");
const heading = { merge: "Auto-merge: eligible", skip: "Auto-merge: skipped, needs a human", "needs-beta": "Auto-merge: security fix that changes the shipped bytes, needs a beta" }[result.action];
const body = `**${heading}**${config.dryRun ? " (dry run: nothing was merged)" : ""}\n\n${lines}\n\n${why}\n\nSecurity: ${result.security ? result.severity : "no"}`;
console.log(body);
// `--local` reads and reports only (a rehearsal against any PR number: nothing is written).
if (process.argv.includes("--local")) process.exit(0);
gh("pr", "comment", String(number), "--edit-last", "--create-if-none", "--body", `${body}\n\n---\n_Dependabot auto-merge lane (scripts/automerge-policy.mjs)_`);

// main moved since the build and nothing else is wrong: ask Dependabot for a fresh branch, which re-runs CI and the build.
if (result.action === "skip" && result.reasons.length === 1 && result.reasons[0] === "main moved since the build" && !config.dryRun) {
  gh("pr", "comment", String(number), "--body", "@dependabot rebase");
}
if (result.action === "needs-beta") {
  gh("label", "create", "needs-beta", "--force", "--color", "B60205", "--description", "Security fix that changes shipped bytes: cut a beta");
  gh("pr", "edit", String(number), "--add-label", "needs-beta");
  gh("issue", "create", "--title", `Security update needs a beta: PR #${number}`, "--label", "needs-beta", "--body", `${pr.html_url}\n\n${lines}\n\nThe update changes the built artifact, so it must ship as a beta. It was not merged.`);
}
if (result.action === "merge" && !config.dryRun) {
  try {
    gh("pr", "merge", String(number), "--merge", "--match-head-commit", pr.head.sha);
  } catch (error) {
    // GitHub's own rules (a required review, a check still pending, a moved head) may refuse a merge the policy allowed.
    // That is a stop, not a failure: say so on the PR and end green so the owner is not paged for a rule doing its job.
    const reason = String(error.stderr ?? error.message).split("\n")[0];
    console.log(`::warning title=Auto-merge refused by GitHub::${reason}`);
    gh("pr", "comment", String(number), "--body", `Auto-merge: the policy allowed this PR but GitHub refused the merge (${reason}). It stays open for a human.`);
    process.exit(0);
  }
  // Merges made with GITHUB_TOKEN do not start the push workflows: start CI on main by hand.
  gh("workflow", "run", config.ciWorkflow, "--ref", "main");
  // Tell the workflow a merge happened: it watches that CI run and opens the pause issue when it fails.
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "merged=true\n");
}
