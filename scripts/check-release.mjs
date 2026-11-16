#!/usr/bin/env node
// Pre-release checks for the plugin. Run locally before tagging (`npm run check-release`) and in
// CI. Exit 0 on pass, 1 on any FAIL; WARN only fails under --strict.
//
//   node scripts/check-release.mjs
//   node scripts/check-release.mjs --tag 0.11.1-beta.1
//   node scripts/check-release.mjs --with-build   # also runs build + test + lint
//   node scripts/check-release.mjs --with-lint    # lint only
//   node scripts/check-release.mjs --strict       # warnings block
//   node scripts/check-release.mjs --allow-min-app-change
//
// The checks themselves are pure predicates in scripts/lib/releaseChecks.mjs (unit tested);
// this file only gathers the inputs and reports.
import { checkAutomergeLane } from "./lib/automergeLane.mjs";
import { readFile, stat, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
	MIN_AGE_DAYS,
	MIN_NPM_WITH_RELEASE_AGE,
	checkDependabotCooldown,
	checkNpmrc,
	npmSupportsMinReleaseAge,
} from "./lib/supplyChainChecks.mjs";
import {
	checkCommittedManifestStable,
	checkManifestFields,
	checkMinAppVersion,
	checkReleaseWorkflow,
	checkTagMatchesManifest,
	checkToolchain,
	checkVersionSync,
	checkVersionsJson,
	filesMissingNormalizePath,
	findNodeOnlyImports,
} from "./lib/releaseChecks.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------- CLI ----------
const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const argValue = (flag) => {
	const i = argv.indexOf(flag);
	const v = i === -1 ? undefined : argv[i + 1];
	return v && !v.startsWith("--") ? v : null;
};
// GITHUB_REF_NAME is "15/merge" on a pull request, so only a tag ref counts as a tag.
const rawTag =
	argValue("--tag") ||
	(process.env.GITHUB_REF?.startsWith("refs/tags/") ? process.env.GITHUB_REF.slice("refs/tags/".length) : null);
const tag = rawTag ? rawTag.replace(/^v/, "") : null;
const runBuildAndTest = hasFlag("--with-build");
const runLint = hasFlag("--with-lint") || runBuildAndTest;
const strict = hasFlag("--strict");
const allowMinAppChange = hasFlag("--allow-min-app-change");

// ---------- Reporting ----------
const results = { pass: 0, fail: 0, warn: 0, skip: 0 };
const pass = (name, detail = "") => {
	results.pass++;
	console.log(`ok   ${name}${detail ? `: ${detail}` : ""}`);
};
const fail = (name, detail = "") => {
	results.fail++;
	console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
};
const warn = (name, detail = "") => {
	results.warn++;
	console.log(`WARN ${name}${detail ? `: ${detail}` : ""}`);
};
const skip = (name, detail = "") => {
	results.skip++;
	console.log(`skip ${name}${detail ? ` (${detail})` : ""}`);
};
// Informational only, never counted: dev-dependency advisories must not hold back a user fix.
const note = (name, detail = "") => console.log(`note ${name}${detail ? `: ${detail}` : ""}`);
const report = (name, problems, okDetail = "") =>
	problems.length === 0 ? pass(name, okDetail) : fail(name, problems.join("; "));

// ---------- Helpers ----------
async function readText(p) {
	try {
		return await readFile(join(ROOT, p), "utf8");
	} catch {
		return null;
	}
}
async function readJson(name) {
	const text = await readText(name);
	if (text === null) throw new Error(`${name} missing`);
	return JSON.parse(text);
}
async function fileSize(p) {
	try {
		const s = await stat(join(ROOT, p));
		return s.isFile() ? s.size : -1;
	} catch {
		return -1;
	}
}
async function walk(dir, out = []) {
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const e of entries) {
		const full = join(dir, e.name);
		if (e.isDirectory()) await walk(full, out);
		else if (e.isFile() && /\.ts$/.test(e.name)) out.push(full);
	}
	return out;
}
async function srcFiles() {
	const out = [];
	for (const f of await walk(join(ROOT, "src"))) {
		out.push({ path: relative(ROOT, f), text: await readFile(f, "utf8") });
	}
	return out;
}
const run = (cmd, args, extra = {}) =>
	spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...extra });

// ---------- Toolchain ----------
{
	const npmV = run("npm", ["-v"]).stdout.trim();
	report("node >= 24 and npm >= 11.10", checkToolchain(process.version, npmV), `node ${process.version}, npm ${npmV}`);
}

// ---------- Artifacts ----------
for (const [p, label] of [
	["manifest.json", "manifest.json present"],
	["versions.json", "versions.json present"],
	["README.md", "README.md present"],
	["LICENSE", "LICENSE present"],
	["styles.css", "styles.css present and non-empty"],
]) {
	const size = await fileSize(p);
	if (size > 0) pass(label, `${size} B`);
	else fail(label, size === 0 ? `${p} is empty` : `${p} missing`);
}
{
	const size = await fileSize("main.js");
	if (size > 0) pass("main.js built and non-empty", `${size} B`);
	else if (runBuildAndTest) skip("main.js present", "built later by --with-build");
	else fail("main.js built and non-empty", size === 0 ? "main.js is empty" : "main.js missing; run npm run build");
}

// ---------- JSON files ----------
let manifest = null;
let pkg = null;
let lock = null;
let versions = null;
for (const [name, set] of [
	["manifest.json", (v) => (manifest = v)],
	["package.json", (v) => (pkg = v)],
	["package-lock.json", (v) => (lock = v)],
	["versions.json", (v) => (versions = v)],
]) {
	try {
		set(await readJson(name));
		pass(`${name} parses as JSON`);
	} catch (e) {
		fail(`${name} parses as JSON`, e.message);
	}
}

if (manifest) report("manifest.json fields", checkManifestFields(manifest));
if (manifest && pkg) report("versions in sync (manifest, package.json, lock)", checkVersionSync(manifest, pkg, lock), manifest.version);
if (manifest && versions) report("versions.json: stable only, ascending, lists the manifest version when stable", checkVersionsJson(versions, tag ?? manifest.version));

// ---------- Tag / committed state ----------
if (manifest) {
	if (tag) {
		report("manifest.version matches the release tag", checkTagMatchesManifest(tag, manifest.version), tag);
	} else {
		skip("manifest.version matches the release tag", "no --tag and not on a tag ref");
		report("committed manifest.version is a stable version", checkCommittedManifestStable(manifest.version), manifest.version);
	}
}

// minAppVersion must equal the latest stable release's (a bump once broke BRAT installs on iOS).
if (manifest) {
	const d = run("git", ["describe", "--tags", "--abbrev=0", "--match", "[0-9]*.[0-9]*.[0-9]*", "--exclude", "*-*"]);
	const stableTag = d.status === 0 ? d.stdout.trim() : "";
	const shown = stableTag ? run("git", ["show", `${stableTag}:manifest.json`]) : null;
	let latestMin = null;
	if (shown && shown.status === 0) {
		try {
			latestMin = JSON.parse(shown.stdout).minAppVersion ?? null;
		} catch {
			latestMin = null;
		}
	}
	if (latestMin === null) skip("minAppVersion unchanged since the latest stable release", "no stable tag in this checkout");
	else report("minAppVersion unchanged since the latest stable release", checkMinAppVersion(manifest.minAppVersion, latestMin, allowMinAppChange), `${manifest.minAppVersion} (${stableTag})`);
}

// ---------- Release workflow ----------
{
	const wf = await readText(".github/workflows/release.yml");
	if (wf === null) fail("release workflow keeps its guards", ".github/workflows/release.yml missing");
	else report("release workflow keeps its guards", checkReleaseWorkflow(wf));
}

// ---------- Source hygiene ----------
{
	const files = await srcFiles();
	if (manifest) {
		const imports = findNodeOnlyImports(files);
		if (imports.length === 0) pass("mobile-safe imports");
		else if (manifest.isDesktopOnly === true) pass("mobile-safe imports", "node-only imports allowed: isDesktopOnly=true");
		else fail("mobile-safe imports", `${imports.slice(0, 3).join("; ")} but isDesktopOnly is not true`);
	}
	const bare = filesMissingNormalizePath(files);
	if (bare.length === 0) pass("vault paths use normalizePath()");
	else warn("vault paths use normalizePath()", bare.join(", "));
	const hits = files.filter((f) => /\/(?:Users|home)\/[a-zA-Z][\w.-]*|[A-Za-z]:\\Users\\[a-zA-Z]/.test(f.text));
	if (hits.length === 0) pass("no hardcoded local paths in source");
	else fail("no hardcoded local paths in source", hits.map((f) => f.path).join(", "));
}
{
	const entries = await readdir(ROOT, { withFileTypes: true });
	let strays = entries
		.filter((e) => e.isFile())
		.map((e) => e.name)
		.filter((n) => /\.(ts|tsx)$/.test(n) || n === "main.js.map" || /\.bak$/.test(n))
		.filter((n) => !/\.config\.(ts|mts|js|mjs|cjs)$/.test(n));
	if (strays.length) {
		const ignored = new Set(run("git", ["check-ignore", ...strays]).stdout.split("\n").map((s) => s.trim()));
		strays = strays.filter((n) => !ignored.has(n));
	}
	if (strays.length === 0) pass("no stray distributable files at the repo root");
	else warn("no stray distributable files at the repo root", strays.join(", "));
}

// ---------- Dependencies ----------
function audit(omitDev) {
	const r = run("npm", omitDev ? ["audit", "--json", "--omit=dev"] : ["audit", "--json"]);
	let json;
	try {
		json = JSON.parse(r.stdout || "");
	} catch {
		return { ok: false, reason: (r.stderr || "no JSON on stdout").trim().split("\n")[0] };
	}
	if (json.error) return { ok: false, reason: json.error.summary || json.error.code || "audit error" };
	const m = json.metadata?.vulnerabilities ?? {};
	return { ok: true, total: typeof m.total === "number" ? m.total : 0, names: Object.keys(json.vulnerabilities ?? {}) };
}
{
	// The plugin ships no runtime dependencies, so --omit=dev is exactly what a user can be exposed to.
	const prod = audit(true);
	if (!prod.ok) skip("no vulnerable runtime dependencies", `npm audit unavailable: ${prod.reason}`);
	else if (prod.total === 0) pass("no vulnerable runtime dependencies", "npm audit --omit=dev is clean");
	else fail("no vulnerable runtime dependencies", `${prod.total}: ${prod.names.slice(0, 5).join(", ")}`);
	const all = audit(false);
	if (all.ok) note("dev-dependency advisories", `${all.total - (prod.ok ? prod.total : 0)} in the toolchain, not shipped, non-blocking`);
}
{
	const modules = await stat(join(ROOT, "node_modules")).then((s) => s.isDirectory(), () => false);
	if (!modules) skip("dependency tree is consistent", "node_modules not installed");
	else {
		const r = run("npm", ["ls", "--all"]);
		if (r.status === 0) pass("dependency tree is consistent", "npm ls reports no conflicts");
		else {
			const problems = (r.stderr || "")
				.split("\n")
				.filter((l) => /invalid|extraneous|missing|peer dep/i.test(l))
				.map((l) => l.replace(/^npm (error|warn)\s*/, "").trim());
			fail("dependency tree is consistent", problems.slice(0, 3).join("; ") || "npm ls exited non-zero");
		}
	}
}
if (pkg) {
	// Deny-all install-script policy: esbuild needs no postinstall.
	const allow = pkg.allowScripts;
	if (!allow || typeof allow !== "object") warn("npm install-script policy recorded", "no allowScripts in package.json");
	else {
		const approved = Object.keys(allow).filter((k) => allow[k]);
		if (approved.length) fail("npm install-script policy recorded", `install scripts approved for: ${approved.join(", ")}`);
		else pass("npm install-script policy recorded", `denied: ${Object.keys(allow).join(", ")}`);
	}
}
{
	const dep = checkDependabotCooldown(await readText(".github/dependabot.yml"));
	if (dep.ok) pass("Dependabot cooldown (npm + github-actions)", `>= ${MIN_AGE_DAYS} days`);
	else fail("Dependabot cooldown (npm + github-actions)", dep.problems.join("; "));

	// The auto-merge lane (.github/workflows/dependabot-automerge.yml) holds a write token: its config must parse and its
	// workflow must start from no permissions at all.
	const lane = checkAutomergeLane(await readText(".github/automerge.json"), await readText(".github/workflows/dependabot-automerge.yml"));
	if (lane.ok) pass("Dependabot auto-merge lane", lane.dryRun ? "configured, dry run (never merges)" : "configured, live");
	else fail("Dependabot auto-merge lane", lane.problems.join("; "));

	const rc = checkNpmrc(await readText(".npmrc"));
	if (rc.ok) pass("npm min-release-age", `${rc.days} days`);
	else fail("npm min-release-age", rc.problem);
	const npmVersion = run("npm", ["-v"]).stdout.trim();
	if (npmSupportsMinReleaseAge(npmVersion)) pass("npm honours min-release-age", `npm ${npmVersion}`);
	else fail("npm honours min-release-age", `npm ${npmVersion || "?"} is older than ${MIN_NPM_WITH_RELEASE_AGE}`);
}

// ---------- styles.css lint (the review lints CSS too) ----------
{
	const cfg = await readText("stylelint.config.mjs");
	if (cfg === null) fail("stylelint config present", "stylelint.config.mjs is missing");
	else if (!/declaration-no-important/.test(cfg) || !/declaration-block-no-duplicate-properties/.test(cfg) || !/no-unsupported-browser-features/.test(cfg) || !/browsers:\s*\[\s*"chrome \d+"/.test(cfg)) {
		fail("stylelint config present", "must enable declaration-no-important, declaration-block-no-duplicate-properties and no-unsupported-browser-features with a chrome target");
	} else pass("stylelint config present", "declaration-no-important + declaration-block-no-duplicate-properties + no-unsupported-browser-features");
}

// ---------- Scripts, lint, build, test ----------
if (pkg) {
	const scripts = pkg.scripts ?? {};
	const missing = ["build", "test", "lint"].filter((s) => typeof scripts[s] !== "string");
	if (missing.length === 0) pass("package.json defines build, test and lint");
	else fail("package.json defines build, test and lint", `missing: ${missing.join(", ")}`);

	if (!runLint) skip("npm run lint passes", "pass --with-build or --with-lint");
	else {
		console.log("  running npm run lint ...");
		const r = run("npm", ["run", "lint", "--silent", "--", "--format", "json"], { env: { ...process.env, FORCE_COLOR: "0" } });
		let parsed = null;
		try {
			const start = r.stdout.indexOf("[");
			parsed = JSON.parse(start >= 0 ? r.stdout.slice(start) : r.stdout);
		} catch {
			parsed = null;
		}
		if (!parsed) fail("npm run lint passes", `could not parse ESLint output: ${(r.stderr || "").trim().split("\n").slice(-2).join(" | ")}`);
		else {
			const errors = parsed.reduce((n, f) => n + (f.errorCount ?? 0), 0);
			const warnings = parsed.reduce((n, f) => n + (f.warningCount ?? 0), 0);
			if (errors === 0 && warnings === 0) pass("npm run lint passes", "0 errors, 0 warnings");
			else fail("npm run lint passes", `${errors} errors, ${warnings} warnings`);
		}
	}

	if (!runLint) skip("styles.css passes stylelint", "pass --with-build or --with-lint");
	else if (typeof scripts["lint:css"] !== "string") fail("styles.css passes stylelint", "no lint:css script in package.json");
	else {
		console.log("  running npm run lint:css ...");
		const r = run("npm", ["run", "lint:css", "--silent"], { env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" } });
		if (r.status === 0) pass("styles.css passes stylelint");
		else fail("styles.css passes stylelint", (r.stdout + r.stderr).trim().split("\n").slice(0, 3).join(" | "));
	}

	if (!runBuildAndTest) {
		skip("npm run build passes", "pass --with-build");
		skip("npm run test passes", "pass --with-build");
	} else {
		for (const script of ["build", "test"]) {
			console.log(`  running npm run ${script} ...`);
			const r = run("npm", ["run", script, "--silent"]);
			if (r.status === 0) pass(`npm run ${script} passes`);
			else fail(`npm run ${script} passes`, `exit ${r.status}: ${(r.stderr || r.stdout || "").trim().split("\n").slice(-3).join(" | ")}`);
		}
	}
}

// ---------- Summary ----------
const total = results.pass + results.fail + results.warn + results.skip;
const blocked = results.fail > 0 || (strict && results.warn > 0);
console.log("");
console.log(
	`${total} checks: ${results.pass} passed, ${results.fail} failed, ${results.warn} warned, ${results.skip} skipped. ` +
		(blocked ? "DO NOT release." : "Ready to release."),
);
process.exit(blocked ? 1 : 0);
