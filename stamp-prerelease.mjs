// Stamps a prerelease version (x.y.z-beta.N) into the WORKING TREE ONLY. Run by the
// release workflow for beta tags; nothing is ever committed.
//
// Why: the community directory reads manifest.json on the default branch to decide the
// latest version and only matches it against full releases. A beta version there gets
// the plugin delisted (2026-09-18). BRAT, by contrast, reads manifest.json from the
// release ASSETS. So the committed manifest stays on the current stable version, and
// only the uploaded asset carries the beta version.
//
// Adapted from davadev's obsidian_chinese_comprehensible_input (MIT).
//
// Usage: node stamp-prerelease.mjs 0.10.5-beta.1

import { readFileSync, writeFileSync } from "fs";

function die(msg) {
	console.error(`stamp-prerelease: ${msg}`);
	process.exit(1);
}

function cmpSemver(a, b) {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < 3; i++) {
		if (pa[i] !== pb[i]) return pa[i] - pb[i];
	}
	return 0;
}

const tag = String(process.argv[2] || "");
const m = /^(\d+\.\d+\.\d+)-beta\.\d+$/.exec(tag);
if (!m) die(`not a beta tag: "${tag}" (expected x.y.z-beta.N)`);
const base = m[1];

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const stable = manifest.version;

// The committed manifest must be a plain stable version; a suffix means a beta was
// committed to the branch, which is exactly what this mechanism prevents.
if (stable.includes("-")) die(`committed manifest.json is already a prerelease ("${stable}")`);

// A beta must target the NEXT version, otherwise BRAT ranks it below the stable release.
if (cmpSemver(base, stable) <= 0) die(`${tag} is not newer than the current stable ${stable}`);

// versions.json is deliberately left alone: it lists stable versions only.
manifest.version = tag;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

console.log(`stamp-prerelease: working tree stamped ${stable} -> ${tag} (committed manifest unchanged)`);
