// TEMPLATE: scripts/lib/automergePolicy.mjs
// WHAT: pure decision logic of the Dependabot auto-merge lane. No I/O: scripts/automerge-policy.mjs gathers the facts
//       (API JSON, file contents, build hashes) and acts on the verdict; src/tests/automergePolicy.test.ts covers every branch.
// CHANGE: nothing is plugin-specific. Per-plugin knobs live in .github/automerge.json.
// GUARDS: a bot merging code nobody read. A PR merges by itself only when it is a plain dependency bump of this repo's own
//         Dependabot (package.json + package-lock.json only, registry URLs with integrity, no install scripts, no major,
//         nothing on the denylist), CI is green on the exact head commit, and the built artifact is byte-identical to the one
//         built from the base. Anything else returns "skip" (a human looks) or "needs-beta" (a security fix that changes the
//         shipped bytes: it must go out as a beta, never unattended).

export const MIN_AGE_DAYS = { critical: 0, security: 3, routine: 14 };
export const ALLOWED_FILES = ["package.json", "package-lock.json"];
const DEP_SECTIONS = ["dependencies", "devDependencies", "optionalDependencies"];
const PLAIN_RANGE = /^[\^~]?\d+\.\d+\.\d+$/;
const REGISTRY = "https://registry.npmjs.org/";

/** `1.2.3` (also `^1.2.3`, `~1.2.3`, `v1.2.3-beta.1`) -> [1, 2, 3], or null when it is not a plain version. */
export function parseVersion(text) {
  const m = /^[\^~v]?(\d+)\.(\d+)\.(\d+)/.exec(String(text ?? ""));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/**
 * Breaking by semver, or by the 0.x convention (esbuild 0.21 -> 0.28 is a "minor" to npm and breaking in fact).
 * An unparseable version counts as breaking: the safe answer.
 */
export function isBreaking(from, to) {
  const a = parseVersion(from);
  const b = parseVersion(to);
  if (!a || !b) return true;
  if (a[0] !== b[0]) return true;
  if (a[0] === 0 && a[1] !== b[1]) return true;
  return false;
}

/** True when `to` is older than `from` (a downgrade is never an automatic update). */
export function isDowngrade(from, to) {
  const a = parseVersion(from);
  const b = parseVersion(to);
  if (!a || !b) return true;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return b[i] < a[i];
  return false;
}

export function denied(name, denylist) {
  return denylist.some((entry) => (entry.endsWith("/*") ? name.startsWith(entry.slice(0, -1)) : name === entry));
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** `overrides` may only name plain semver ranges (no `npm:` alias, git, file, URL), at any nesting depth. */
function overridesPlain(node) {
  if (typeof node === "string") return PLAIN_RANGE.test(node) || node === "." || node.startsWith("$");
  return Object.values(node).every(overridesPlain);
}

/**
 * package.json before and after. Only version strings of dependencies that already existed (and `overrides` values)
 * may change; scripts, engines, names, new or removed dependencies, peer ranges: all must be identical.
 */
export function checkPackageJson(base, head, denylist) {
  const problems = [];
  const strip = (pkg) => {
    const copy = { ...pkg };
    for (const key of [...DEP_SECTIONS, "overrides"]) delete copy[key];
    return copy;
  };
  if (!same(strip(base), strip(head))) problems.push("package.json changed outside dependency versions");
  for (const section of DEP_SECTIONS) {
    const before = base[section] ?? {};
    const after = head[section] ?? {};
    if (!same(Object.keys(before).sort(), Object.keys(after).sort())) problems.push(`${section}: a dependency was added or removed`);
    for (const name of Object.keys(after)) {
      if (before[name] === undefined || before[name] === after[name]) continue;
      if (denied(name, denylist)) problems.push(`${name} is on the denylist`);
      if (!PLAIN_RANGE.test(after[name])) problems.push(`${name}: ${after[name]} is not a plain version range`);
      else if (isBreaking(before[name], after[name])) problems.push(`${name}: ${before[name]} -> ${after[name]} is a major (or 0.x minor) bump`);
      else if (isDowngrade(before[name], after[name])) problems.push(`${name}: ${before[name]} -> ${after[name]} is a downgrade`);
    }
  }
  if (head.overrides !== undefined && !same(base.overrides, head.overrides) && !overridesPlain(head.overrides)) {
    problems.push("overrides: only plain semver ranges are allowed");
  }
  return problems;
}

const depName = (path) => path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);

/**
 * package-lock.json before and after. Every entry that changed or appeared must come from the npm registry with an
 * integrity hash, carry no install script, stay on the same major, and avoid the denylist. Returns problems and the
 * list of version changes (used for the age check and the advisory match).
 */
export function checkLockfile(base, head, denylist) {
  const problems = [];
  const changes = [];
  if (head.lockfileVersion !== 3 || base.lockfileVersion !== 3) problems.push("lockfileVersion is not 3");
  const before = base.packages ?? {};
  const after = head.packages ?? {};
  for (const [path, entry] of Object.entries(after)) {
    if (path === "") continue;
    const old = before[path];
    if (old && same(old, entry)) continue;
    const name = entry.name ?? depName(path);
    if (entry.link || !entry.resolved?.startsWith(REGISTRY)) problems.push(`${name}: not resolved from ${REGISTRY}`);
    if (!/^sha512-/.test(entry.integrity ?? "")) problems.push(`${name}: no sha512 integrity`);
    if (entry.hasInstallScript) problems.push(`${name}: has an install script`);
    if (denied(name, denylist)) problems.push(`${name} is on the denylist`);
    if (old) {
      if (isBreaking(old.version, entry.version)) problems.push(`${name}: ${old.version} -> ${entry.version} is a major (or 0.x minor) bump`);
      else if (isDowngrade(old.version, entry.version)) problems.push(`${name}: ${old.version} -> ${entry.version} is a downgrade`);
      if (old.version !== entry.version) changes.push({ name, from: old.version, to: entry.version });
    } else {
      changes.push({ name, from: null, to: entry.version });
    }
  }
  return { problems, changes };
}

const RANK = { low: 1, moderate: 2, medium: 2, high: 3, critical: 4 };

/**
 * Which of the changes fix an open advisory? An alert counts when its patched version is at or below the version the PR
 * moves to. Returns { security, severity } with the highest severity among the matches.
 */
export function matchAdvisories(changes, alerts) {
  let severity = null;
  for (const change of changes) {
    for (const alert of alerts) {
      if (alert.name !== change.name || !alert.patched) continue;
      if (isDowngrade(alert.patched, change.to)) continue;
      if (!severity || (RANK[alert.severity] ?? 0) > (RANK[severity] ?? 0)) severity = alert.severity;
    }
  }
  return { security: severity !== null, severity };
}

/** Minimum age (days) a new version must have, by kind of update. */
export function requiredAgeDays(advisory) {
  if (advisory.severity === "critical") return MIN_AGE_DAYS.critical;
  return advisory.security ? MIN_AGE_DAYS.security : MIN_AGE_DAYS.routine;
}

/** The author, the branch and the repository: nothing a fork or a human can spoof into the lane. */
export function checkAuthor(pr, repo) {
  const problems = [];
  if (pr.user?.login !== "dependabot[bot]") problems.push("author is not dependabot[bot]");
  if (pr.head?.repo?.full_name !== repo || pr.base?.repo?.full_name !== repo) problems.push("head is not in this repository");
  if (!String(pr.head?.ref ?? "").startsWith("dependabot/npm_and_yarn/")) problems.push("branch is not a Dependabot npm branch");
  if (pr.draft) problems.push("PR is a draft");
  if (pr.base?.ref !== "main") problems.push("base is not main");
  return problems;
}

export function checkFiles(files) {
  const names = files.map((f) => f.filename);
  const problems = names.filter((n) => !ALLOWED_FILES.includes(n)).map((n) => `${n} is outside the allowed files`);
  if (names.length === 0) problems.push("PR changes no files");
  return problems;
}

/**
 * The artifact comparison produced by the unprivileged build. The privileged job trusts only these facts, and only
 * when they name this very PR, this very head and the current base.
 */
export function checkVerdict(verdict, pr, baseSha, artifacts) {
  const problems = [];
  if (!verdict || typeof verdict !== "object") return ["no build verdict"];
  if (verdict.pr !== pr.number) problems.push("verdict is for another PR");
  if (verdict.headSha !== pr.head.sha) problems.push("verdict is for another head commit");
  if (verdict.baseSha !== baseSha) problems.push("main moved since the build");
  if (verdict.deterministic !== true) problems.push("the build is not reproducible (two builds of main differ)");
  for (const name of artifacts) {
    const entry = verdict.artifacts?.[name];
    if (!entry || !/^[0-9a-f]{64}$/.test(entry.base ?? "") || !/^[0-9a-f]{64}$/.test(entry.head ?? "")) problems.push(`no hashes for ${name}`);
  }
  return problems;
}

export function bytesChanged(verdict, artifacts) {
  return artifacts.some((name) => verdict.artifacts[name].base !== verdict.artifacts[name].head);
}

/** Repository facts every plugin must have before the lane is allowed to merge anything. */
export function checkRepoFacts(facts) {
  const problems = [];
  if (!facts.minReleaseAge) problems.push(".npmrc has no min-release-age");
  if (!facts.cooldown) problems.push("dependabot.yml has no cooldown");
  if (facts.scriptsAllowed) problems.push("package.json allowScripts approves a package");
  return problems;
}

/** Every required job must be a success on the head commit. A missing job is a failure, not a pass. */
export function checkRuns(runs, required) {
  return required.filter((name) => !runs.some((run) => run.name === name && run.conclusion === "success")).map((name) => `check "${name}" is not green on the head commit`);
}

/**
 * The whole decision. `facts` carries everything gathered by the CLI:
 *   config, repo, pr, files, basePackage, headPackage, baseLock, headLock, runs, verdict, baseSha, alerts, ages, repoFacts, paused
 * Returns { action: "merge" | "skip" | "needs-beta", reasons, security, severity, changes }.
 * Never throws on a malformed fact: a missing one is a reason to skip.
 */
export function evaluate(facts) {
  const { config } = facts;
  const reasons = [];
  reasons.push(...checkAuthor(facts.pr, facts.repo));
  reasons.push(...checkFiles(facts.files));
  reasons.push(...checkRepoFacts(facts.repoFacts));
  if (facts.paused) reasons.push("auto-merge is paused: main is red after an earlier auto-merge");
  const pkg = checkPackageJson(facts.basePackage, facts.headPackage, config.denylist);
  const lock = checkLockfile(facts.baseLock, facts.headLock, config.denylist);
  reasons.push(...pkg, ...lock.problems);
  if (lock.changes.length === 0 && pkg.length === 0) reasons.push("no dependency version changes");
  const advisory = matchAdvisories(lock.changes, facts.alerts);
  const minAge = requiredAgeDays(advisory);
  for (const change of lock.changes) {
    const age = facts.ages[`${change.name}@${change.to}`];
    if (typeof age !== "number") reasons.push(`${change.name}@${change.to}: publish date unknown`);
    else if (age < minAge) reasons.push(`${change.name}@${change.to} is ${age.toFixed(1)} day(s) old, minimum ${minAge}`);
  }
  reasons.push(...checkRuns(facts.runs, config.requiredChecks));
  const verdictProblems = checkVerdict(facts.verdict, facts.pr, facts.baseSha, config.artifacts);
  reasons.push(...verdictProblems);
  const result = { security: advisory.security, severity: advisory.severity, changes: lock.changes };
  if (verdictProblems.length === 0 && bytesChanged(facts.verdict, config.artifacts)) {
    // Only a security fix with no other objection is escalated; everything else with changed bytes waits for a human.
    const escalate = advisory.security && reasons.length === 0;
    return { action: escalate ? "needs-beta" : "skip", reasons: [...reasons, "the built artifact changed: this update ships to users"], ...result };
  }
  return { action: reasons.length === 0 ? "merge" : "skip", reasons, ...result };
}
