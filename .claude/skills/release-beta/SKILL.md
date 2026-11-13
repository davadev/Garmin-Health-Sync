---
name: release-beta
description: Cut a prerelease (X.Y.Z-beta.N) of Garmin Health Sync for BRAT testing. Use whenever a change has merged to main and needs testing, or the user says "release", "tag", "ship a beta", "publish". Every release starts as a prerelease; never create a bare X.Y.Z tag here (use release-stable, only on explicit go-ahead).
---

# Release a beta

`main`'s `manifest.json`, `package.json` and `versions.json` **do not change**. CI stamps the beta version into the working tree only (`stamp-prerelease.mjs`, never commit its output). The invariant: `main`'s manifest always names a version that already has a published, non-prerelease release.

**Dependabot gate first.** Before tagging, run the Dependabot gate in `AGENTS.md` (Dependabot gate): every open Dependabot PR is folded into this beta (merged or superseded), not left behind.

## Steps
1. The change is merged to `main` via PR with CI green. `git checkout main && git pull`; `main`'s manifest is still the current stable version.
2. `npm run check-release -- --with-build` -> `0 failed, 0 warned`; `npm run lint:cloud-parity` -> `0 errors`. Never skip. A project hook (`.claude/hooks/pre-tag-check.mjs`) re-runs `check-release --with-lint` before any semver tag command and blocks on failure; it does not replace this step.
3. Make sure `CHANGELOG.md` has a `## X.Y.Z-beta.N` section for this beta (the release notes are taken from it). If users should be told something, `src/release-notes.ts` has an entry for `X.Y.Z` with texts in all six languages (the in-app "what's new" window).
4. Next number: `git tag --list 'X.Y.Z-beta.*' --sort=-v:refname | head -1`, +1. The `-beta.N` suffix is mandatory. A published beta number is never reused.
5. Only with Daniel's go-ahead for this tag: `git tag X.Y.Z-beta.N && git push origin X.Y.Z-beta.N` (the tag by name, never `--tags`). Never run `gh release create` by hand; `release.yml` lints, builds, tests with coverage, runs `check-release --strict`, attests and publishes the prerelease.
6. Verify: `gh run list --workflow Release --limit 1`; `gh release view X.Y.Z-beta.N --json tagName,isPrerelease,assets` -> prerelease, assets exactly `main.js`, `manifest.json`, `styles.css`; the latest release is still the old stable; `main`'s manifest still shows the stable version. Bytes: `gh release download X.Y.Z-beta.N -p main.js` and compare its sha256 with a clean local `npm ci && npm run build` of the tagged commit. The asset manifest differs from `main`'s only in `version`; `minAppVersion` is unchanged.
7. Tell Daniel what is in the beta and give the **most minimal smoke test** for it (what could this beta break, shortest check on the phone). BRAT -> check for updates, confirm the version in Settings -> Community plugins.
8. Workflow failed before publishing: `git push origin :<tag> && git tag -d <tag>`, fix on a branch, retag the same number. Once published, a fix gets the next number.

## Never
- Commit a `-beta.N` version to `main`, hand-upload assets, hand-edit the manifest.
- Tag a commit that is not on `main` (the workflow refuses it).
