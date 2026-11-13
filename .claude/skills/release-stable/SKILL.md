---
name: release-stable
description: Promote a tested beta to stable X.Y.Z of Garmin Health Sync. ONLY on Daniel's explicit go-ahead. Use when the user says "promote", "go stable", "publish stable", "release for everyone". Covers the release branch, version bump, tagging the branch head before merge, and the store-listing check.
---

# Promote to stable

Only after Daniel says so explicitly, and only when: the last beta's smoke list passed on a real phone and on desktop (no new issues reported), and the directory entry is checked (it points at `davadev/Garmin-Health-Sync`, or the listing offers the current stable through the redirect). The stable release must be **published before `main` advertises it**.

**Alert gate.** Run the Dependabot gate in `AGENTS.md` (Dependabot gate) before tagging: **0 open alerts**, or the user has been told which remain and why. Dependabot PRs that opened after the tested beta go into the next beta, not into this stable.

## Steps
1. `git checkout -b release/X.Y.Z main` (`release/*` is reserved for this).
2. `npm version X.Y.Z --no-git-tag-version` (updates `package.json` + lock and runs the `version` script, `version-bump.mjs`, which writes `manifest.json` and `versions.json` and stages them; rehearsed on 2026-10-25, it does run with `--no-git-tag-version`). Check `git diff HEAD --stat` shows all four files (staged changes do not show in a plain `git diff`) and `git tag --list X.Y.Z` is empty. If `manifest.json` / `versions.json` did not change: `npm_package_version=X.Y.Z node version-bump.mjs`. `versions.json` sorted, `X.Y.Z` last, no beta keys. Merge the beta CHANGELOG sections into one `## X.Y.Z` section.
3. `npm run check-release -- --tag X.Y.Z --with-build --strict` -> clean.
4. Commit `X.Y.Z - short description`, push, open the PR. `validate` and `timezones` go green; `store-listing` is red (release not published yet) - expected.
5. Tag the **branch head**: `git tag X.Y.Z && git push origin X.Y.Z`. Wait for `release.yml`. Verify `gh release view X.Y.Z --json tagName,isLatest,isPrerelease,assets` -> latest, not prerelease, three assets.
6. Re-run `store-listing` on the PR -> green. Merge with `gh pr merge <n> --merge` (never squash: the tagged commit must stay reachable from `main`).
7. After the merge: `main`'s manifest is X.Y.Z, release X.Y.Z is latest. BRAT testers move over automatically.
8. Workflow failed at step 5: delete the tag (`git push origin :X.Y.Z && git tag -d X.Y.Z`), fix on the branch, retag. `main` was never touched.

## Never
- Create the bare tag early and flag it prerelease; bump `main` to a version with no published release; skip the smoke test of the last beta on a real device.
