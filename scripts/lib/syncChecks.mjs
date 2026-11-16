// TEMPLATE: scripts/lib/syncChecks.mjs
// WHAT: pure helpers behind scripts/sync-main.mjs (`npm run sync`): is node_modules still the one package-lock.json
//       describes, and what to tell the agent after pulling in what the Dependabot auto-merge lane merged.
// CHANGE: nothing.
// GUARDS: an agent working on a stale checkout builds and tests an old dependency tree, then opens a PR whose lockfile
//         conflicts with the one the lane already merged.
import { createHash } from "node:crypto";

export const STAMP_FILE = "node_modules/.sync-lock-hash";

export const hashText = (text) => createHash("sha256").update(text).digest("hex");

/** node_modules is current when the stamp written after the last install equals the hash of the lockfile in the checkout. */
export const installStale = (stamp, lockHash) => stamp !== lockHash;

/** One short report. Every line is something the agent must act on or know; silence means nothing to do. */
export function formatReport({ branch, behind, lockChanged, fastForwarded, installed, merged, flagged, offline }) {
  const lines = [];
  if (offline) lines.push("sync: could not reach origin (offline?); working from the local state");
  if (fastForwarded) lines.push(`sync: main fast-forwarded by ${fastForwarded} commit(s)`);
  if (installed) lines.push("sync: package-lock.json changed, ran `npm ci --ignore-scripts`");
  if (behind > 0 && branch !== "main") {
    lines.push(`sync: ${branch} is ${behind} commit(s) behind origin/main${lockChanged ? " and origin/main changed package-lock.json" : ""}.`);
    lines.push(lockChanged ? "      Merge origin/main before the PR; on a lockfile conflict: git checkout origin/main -- package-lock.json && npm install" : "      Merge or rebase origin/main before the PR.");
  }
  if (behind > 0 && branch === "main" && !fastForwarded) lines.push(`sync: main is ${behind} commit(s) behind origin/main and could not be fast-forwarded (local changes or divergence): resolve before working.`);
  if (merged.length > 0) lines.push(`sync: dependency updates merged automatically since the last release:\n${merged.map((m) => `      - ${m}`).join("\n")}`);
  for (const item of flagged) lines.push(`sync: NEEDS A HUMAN: ${item}`);
  return lines.join("\n");
}
