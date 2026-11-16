// What `npm run sync` tells the agent. The git and npm plumbing in scripts/sync-main.mjs is a thin shell around this.
import { describe, expect, it } from "vitest";
import { checkAutomergeLane } from "../../scripts/lib/automergeLane.mjs";
import { formatReport, hashText, installStale } from "../../scripts/lib/syncChecks.mjs";

const quiet = { branch: "main", behind: 0, lockChanged: false, fastForwarded: 0, installed: false, merged: [], flagged: [], offline: false };

describe("install stamp", () => {
	it("is stale when the stamp is missing or differs, current when it matches", () => {
		const hash = hashText("lock");
		expect(installStale("", hash)).toBe(true);
		expect(installStale(hashText("old"), hash)).toBe(true);
		expect(installStale(hash, hash)).toBe(false);
	});
});

describe("formatReport", () => {
	it("says nothing when there is nothing to do", () => {
		expect(formatReport(quiet)).toBe("");
	});
	it("reports offline, a fast-forward and a reinstall", () => {
		const text = formatReport({ ...quiet, offline: true, fastForwarded: 2, installed: true });
		expect(text).toContain("offline");
		expect(text).toContain("fast-forwarded by 2");
		expect(text).toContain("npm ci --ignore-scripts");
	});
	it("tells a feature branch to merge main, with the lockfile recipe when the lockfile moved", () => {
		expect(formatReport({ ...quiet, branch: "feat/x", behind: 3 })).toContain("Merge or rebase origin/main");
		expect(formatReport({ ...quiet, branch: "feat/x", behind: 3, lockChanged: true })).toContain("git checkout origin/main -- package-lock.json");
	});
	it("warns when main could not be fast-forwarded", () => {
		expect(formatReport({ ...quiet, behind: 2 })).toContain("could not be fast-forwarded");
	});
	it("lists the automatic updates and what needs a human", () => {
		const text = formatReport({ ...quiet, merged: ["Merge pull request #5 from o/dependabot/npm_and_yarn/foo"], flagged: ["issue #9 Security update needs a beta"] });
		expect(text).toContain("dependency updates merged automatically");
		expect(text).toContain("NEEDS A HUMAN: issue #9");
	});
});

describe("checkAutomergeLane", () => {
	const config = { dryRun: true, enforcement: "workflow", ciWorkflow: "ci.yml", requiredChecks: ["validate"], buildCommand: "npm run build", artifacts: ["main.js"], denylist: ["esbuild"] };
	const workflow = "name: x\npermissions: {}\njobs: {}\n";
	it("accepts a complete lane and reports whether it is live", () => {
		expect(checkAutomergeLane(JSON.stringify(config), workflow)).toEqual({ ok: true, problems: [], dryRun: true });
		expect(checkAutomergeLane(JSON.stringify({ ...config, dryRun: false }), workflow).dryRun).toBe(false);
	});
	it("refuses missing or broken files", () => {
		expect(checkAutomergeLane(undefined, undefined).problems).toEqual([".github/automerge.json is missing", "dependabot-automerge.yml is missing"]);
		expect(checkAutomergeLane("{", workflow).problems).toEqual([".github/automerge.json is not valid JSON"]);
	});
	it("refuses a config that lost a key or weakened a guard", () => {
		const problems = (over: Record<string, unknown>) => checkAutomergeLane(JSON.stringify({ ...config, ...over }), workflow).problems.join();
		expect(problems({ denylist: undefined })).toContain("no denylist");
		expect(problems({ dryRun: "no" })).toContain("dryRun must be true or false");
		expect(problems({ requiredChecks: [] })).toContain("requiredChecks");
		expect(problems({ artifacts: [] })).toContain("artifacts");
		expect(problems({ denylist: ["vitest"] })).toContain("bundler");
	});
	it("refuses a workflow without top-level empty permissions", () => {
		expect(checkAutomergeLane(JSON.stringify(config), "permissions: write-all\n").problems).toEqual(["dependabot-automerge.yml must start with top-level `permissions: {}`"]);
	});
});
