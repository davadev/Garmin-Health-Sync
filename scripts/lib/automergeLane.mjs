// TEMPLATE: scripts/lib/automergeLane.mjs
// WHAT: check-release's check that the Dependabot auto-merge lane is configured sanely. Pure: takes the file texts.
// CHANGE: nothing.
// GUARDS: a lane whose config silently lost a key (an empty denylist, no required checks) merges more than intended, and a
//         workflow that gained a top-level `permissions: write-all` hands every job a write token.
const REQUIRED = ["dryRun", "enforcement", "ciWorkflow", "requiredChecks", "buildCommand", "artifacts", "denylist"];

export function checkAutomergeLane(configText, workflowText) {
  const problems = [];
  let config = null;
  if (typeof configText !== "string") problems.push(".github/automerge.json is missing");
  else {
    try {
      config = JSON.parse(configText);
    } catch {
      problems.push(".github/automerge.json is not valid JSON");
    }
  }
  if (config) {
    for (const key of REQUIRED) if (config[key] === undefined) problems.push(`automerge.json has no ${key}`);
    if (typeof config.dryRun !== "boolean") problems.push("automerge.json dryRun must be true or false");
    if (!Array.isArray(config.requiredChecks) || config.requiredChecks.length === 0) problems.push("automerge.json requiredChecks must name at least one job");
    if (!Array.isArray(config.artifacts) || config.artifacts.length === 0) problems.push("automerge.json artifacts must name at least one file");
    if (!Array.isArray(config.denylist) || !config.denylist.includes("esbuild")) problems.push("automerge.json denylist must keep the bundler");
  }
  if (typeof workflowText !== "string") problems.push("dependabot-automerge.yml is missing");
  else if (!/^permissions:\s*\{\}\s*$/m.test(workflowText)) problems.push("dependabot-automerge.yml must start with top-level `permissions: {}`");
  return { ok: problems.length === 0, problems, dryRun: config?.dryRun === true };
}
