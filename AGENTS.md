# Obsidian community plugin

## Project overview

- Target: Obsidian Community Plugin (TypeScript → bundled JavaScript).
- Entry point: `main.ts` compiled to `main.js` and loaded by Obsidian.
- Required release artifacts: `main.js`, `manifest.json`, and optional `styles.css`.

## Environment & tooling

- Node.js 24 (see `.nvmrc`), npm >= 11.10. Node 22 and older are not supported; CI also runs Node 26 as a non-blocking look-ahead.
- **Package manager: npm** (required for this sample - `package.json` defines npm scripts and dependencies).
- **Bundler: esbuild** (required for this sample - `esbuild.config.mjs` and build scripts depend on it). Alternative bundlers like Rollup or webpack are acceptable for other projects if they bundle all external dependencies into `main.js`.
- Types: `obsidian` type definitions.

**Note**: This sample project has specific technical dependencies on npm and esbuild. If you're creating a plugin from scratch, you can choose different tools, but you'll need to replace the build configuration accordingly.

### Install

```bash
npm install
```

### Dev (watch)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

## Linting

- To use eslint install eslint from terminal: `npm install -g eslint`
- To use eslint to analyze this project use this command: `eslint main.ts`
- eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder: `eslint ./src/`

## File & folder conventions

- **Organize code into multiple files**: Split functionality across separate modules rather than putting everything in `main.ts`.
- Source lives in `src/`. Keep `main.ts` small and focused on plugin lifecycle (loading, unloading, registering commands).
- **Example file structure**:
  ```
  src/
    main.ts           # Plugin entry point, lifecycle management
    settings.ts       # Settings interface and defaults
    commands/         # Command implementations
      command1.ts
      command2.ts
    ui/              # UI components, modals, views
      modal.ts
      view.ts
    utils/           # Utility functions, helpers
      helpers.ts
      constants.ts
    types.ts         # TypeScript interfaces and types
  ```
- **Do not commit build artifacts**: Never commit `node_modules/`, `main.js`, or other generated files to version control.
- Keep the plugin small. Avoid large dependencies. Prefer browser-compatible packages.
- Generated output should be placed at the plugin root or `dist/` depending on your build setup. Release artifacts must end up at the top level of the plugin folder in the vault (`main.js`, `manifest.json`, `styles.css`).

## Manifest rules (`manifest.json`)

- Must include (non-exhaustive):  
  - `id` (plugin ID; for local dev it should match the folder name)  
  - `name`  
  - `version` (Semantic Versioning `x.y.z`)  
  - `minAppVersion`  
  - `description`  
  - `isDesktopOnly` (boolean)  
  - Optional: `author`, `authorUrl`, `fundingUrl` (string or map)
- Never change `id` after release. Treat it as stable API.
- Keep `minAppVersion` accurate when using newer APIs.
- Canonical requirements are coded here: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml

## Testing

- Manual install for testing: copy `main.js`, `manifest.json`, `styles.css` (if any) to:
  ```
  <Vault>/.obsidian/plugins/<plugin-id>/
  ```
- Reload Obsidian and enable the plugin in **Settings → Community plugins**.

### Automated tests and gates

```bash
npm test                    # vitest (tests/**/*.test.ts); helpers live in testUtils/, never in tests/
npm run test:cov            # + v8 coverage; the gate is 100 % on all four metrics (locked since 0.11.1)
npm run typecheck:tests     # tsc over src, tests, testUtils (tsconfig.test.json)
npm run check:dead-code     # knip --production: code only a test reaches is reported, so delete it
npm run lint:cloud-parity   # lint src/ with moment and @types/node hidden, as the review bot sees it
npm run screenshots         # re-render docs/screenshots from the real panel code and synthetic data (skill: docs-screenshots); check:screenshots verifies without writing
npm run check-release       # pre-release validator, REQUIRED before tagging: -- --tag X | --with-build | --strict
```

- The `obsidian` package ships only types; tests alias it to `testUtils/mocks/obsidian.ts`.
- Tests assert behaviour (vault content, requests sent, notices, persisted settings), are deterministic (fake timers, `vi.setSystemTime`, unrouted `requestUrl` fails the test) and never use `v8 ignore`. Unreachable code is deleted, not hidden; code reachable from persisted or hand-edited `data.json` stays and gets a test.
- Test files are `tests/**/*.test.ts` only and everything else (mocks, fixtures, setup) is under `testUtils/`: the community review bot lints every `.ts`/`.js`/`.css` file except names like `*.test.*` and `testUtils`. `tests/reviewScope.test.ts` enforces it.
- Required CI checks (names must not change): `validate`, `timezones (America/Los_Angeles)`, `timezones (Pacific/Auckland)`, `timezones (Europe/Vienna)`, `store-listing`. `next-node` is informational.

## Commands & settings

- Any user-facing commands should be added via `this.addCommand(...)`.
- If the plugin has configuration, provide a settings tab and sensible defaults.
- Persist settings using `this.loadData()` / `this.saveData()`.
- Use stable command IDs; avoid renaming once released.

## Versioning & releases

- Bump `version` in `manifest.json` (SemVer) and update `versions.json` to map plugin version → minimum app version.
- Create a GitHub release whose tag exactly matches `manifest.json`'s `version`. Do not use a leading `v`.
- Attach `manifest.json`, `main.js`, and `styles.css` (if present) to the release as individual assets.
- After the initial release, follow the process to add/update your plugin in the community catalog as required.

### Release rules (this project)

Procedures live in project skills (`.claude/skills/`): **`docs-screenshots`** to re-render the README images of the side panel, **`release-beta`** for every release that goes out for testing, **`release-stable`** only when Daniel explicitly says to go stable. Load the skill before starting and follow it step by step.

| Trigger | Skill |
|---|---|
| A change is merged to `main` and needs testing; "release", "tag", "ship a beta" | `release-beta` |
| Daniel **explicitly** says "go stable", "promote", "release for everyone" | `release-stable` |
| A panel card or its look changed; a release touches the panel; "screenshots" | `docs-screenshots` |

Always-on rules:

- Branch, PR, CI green, merge with a merge commit (never squash: release tags must stay reachable from `main`), never routine work on `main`. `release/*` branches are reserved for the stable version bump.
- **`main`'s `manifest.json` must always name a version that already has a published, non-prerelease GitHub release** with `main.js`, `manifest.json`, `styles.css` (the community directory reads it; a `-beta.N` on `main` got the plugin delisted on 2026-09-18). Never commit a beta version. The `store-listing` CI check enforces it.
- **Every release starts as `X.Y.Z-beta.N` tagged on `main`** after its PR merged. CI stamps the beta version into the working tree only (`stamp-prerelease.mjs`); do not run `npm version` for a beta. Stable only on explicit instruction, tagged on the `release/X.Y.Z` branch head, merged only after the release exists.
- Releases are tag-driven (`.github/workflows/release.yml`); never `gh release create|upload|edit|delete` by hand. A published beta number is never reused.
- `versions.json` lists stable versions only, ascending, no gaps; keep `package.json`, `package-lock.json`, `manifest.json` and `versions.json` in sync for a stable bump (`npm version X.Y.Z --no-git-tag-version`, because without the flag npm also creates a local git tag).
- `minAppVersion` stays what the latest stable release says unless Daniel decides otherwise (raising it once stopped BRAT installs on iOS).
- **Zero warnings, zero errors**: `npm run build`, `npm run lint`, `typecheck:tests`, `check:dead-code`, `check-release` (and `lint:cloud-parity` for errors) are all clean before a PR is ready and before any tag. The Obsidian review mirrors `eslint-plugin-obsidianmd` findings into the public score, and the bot does not install transitive type packages (`moment`, `@types/node`): never call those directly, go through a locally typed module-level const (see `momentFn` in `src/daily-note.ts`, `window.require` in `garmin-api.ts`). Keep tsconfig `lib` at ES2018+ incl. `DOM.Iterable`. Never silence a rule or add an ignore to get to zero. Never weaken the type-aware `src/**` block in `eslint.config.mts`.
- Source stays on ES2018 and APIs already used in the code base (iOS WebViews are older than Node): no `structuredClone`, `Array.prototype.at`, `Object.hasOwn`, `replaceAll` in `src/`.
- Dependencies are dev-only, exact-pinned, at least 14 days old (`.npmrc` `min-release-age`, Dependabot cooldown); nothing may end up in `main.js`. `@codemirror/state|view` stay pinned to obsidian's exact peer versions; `moment` is obsidian's (do not declare it). Actions are pinned to full commit SHAs.
- Every interpretation the health panel shows under a card's light bulb (`src/panel/insights/`) is a health-related statement: it needs its text in all six languages and a section in `docs/panel-insights.md` (trigger, basis, a link to a source you actually looked up, or `none` and why); `tests/panelInsightsDocs.test.ts` enforces it. No generic advice that applies to everyone (alcohol, caffeine, water): a tip appears only when the user's own data points to it.
- Docs stay interlinked and current (`docs/README.md` is the index): a card in `PANEL_CARDS` needs its section in `docs/panel-cards.md` (`tests/panelCardsDocs.test.ts`), a metric in `src/metrics.ts` needs its row in `docs/metrics.md` (`tests/metricsDocs.test.ts`), a setting needs its line in `docs/settings.md`, and every relative link and anchor in the README files and `docs/*.md` must resolve (`tests/docsLinks.test.ts`). The six `README*.md` keep the same sections, feature bullets and images (`tests/readmeParity.test.ts`). Credits for ideas taken from other plugins live in `NOTICE.md` and the README Credits.
- Release notes come from this version's own section in `CHANGELOG.md` (`## X.Y.Z` or `## X.Y.Z-beta.N`); add it before tagging. Contact for decisions and warnings: Daniel.

### Dependabot gate (before every beta, before every stable)

1. **Open PRs.** `gh pr list --state open --author "app/dependabot"`. Fold every one into the next beta: merge it, or supersede it with your own branch (a conflicting or failing grouped PR is redone on a fresh branch and closed with a pointer), and only then tag. Never tag a beta around an open Dependabot PR. A PR that opens after a beta was tested goes into the following beta, not into the stable that promotes the tested one.
2. **Alerts.** `gh api repos/<owner>/<repo>/dependabot/alerts --jq '[.[]|select(.state=="open")]|length'`. HTTP 403 "Dependabot alerts are disabled" means they are off: turn them on with `gh api -X PUT repos/<owner>/<repo>/vulnerability-alerts` (repo admin; a GET of the same path answering 204 means on), then re-read in a few minutes. Optionally `gh api -X PUT repos/<owner>/<repo>/automated-security-fixes`. Guide: playbook `SUPPLY-CHAIN.md`, "Turning on Dependabot alerts".
3. **Fix, do not dismiss.** Lockfile first (`npm update <pkg>`, exact bump for a direct dependency), then parent-scoped `overrides`, then a clean `rm -rf node_modules && npm ci && npm ls --all && npm audit`. Never dismiss an alert to get green.
4. **Stable needs 0 open alerts.** If one cannot be fixed (no patch yet, a parent breaks under the override), tell the user which and why before tagging stable; the user decides.

## Security, privacy, and compliance

Follow Obsidian's **Developer Policies** and **Plugin Guidelines**. In particular:

- Default to local/offline operation. Only make network requests when essential to the feature.
- No hidden telemetry. If you collect optional analytics or call third-party services, require explicit opt-in and document clearly in `README.md` and in settings.
- Never execute remote code, fetch and eval scripts, or auto-update plugin code outside of normal releases.
- Minimize scope: read/write only what's necessary inside the vault. Do not access files outside the vault.
- Clearly disclose any external services used, data sent, and risks.
- Respect user privacy. Do not collect vault contents, filenames, or personal information unless absolutely necessary and explicitly consented.
- Avoid deceptive patterns, ads, or spammy notifications.
- Register and clean up all DOM, app, and interval listeners using the provided `register*` helpers so the plugin unloads safely.

## UX & copy guidelines (for UI text, commands, settings)

- Prefer sentence case for headings, buttons, and titles.
- Use clear, action-oriented imperatives in step-by-step copy.
- Use **bold** to indicate literal UI labels. Prefer "select" for interactions.
- Use arrow notation for navigation: **Settings → Community plugins**.
- Keep in-app strings short, consistent, and free of jargon.

## Performance

- Keep startup light. Defer heavy work until needed.
- Avoid long-running tasks during `onload`; use lazy initialization.
- Batch disk access and avoid excessive vault scans.
- Debounce/throttle expensive operations in response to file system events.

## Coding conventions

- TypeScript with `"strict": true` preferred.
- **Keep `main.ts` minimal**: Focus only on plugin lifecycle (onload, onunload, addCommand calls). Delegate all feature logic to separate modules.
- **Split large files**: If any file exceeds ~200-300 lines, consider breaking it into smaller, focused modules.
- **Use clear module boundaries**: Each file should have a single, well-defined responsibility.
- Bundle everything into `main.js` (no unbundled runtime deps).
- Avoid Node/Electron APIs if you want mobile compatibility; set `isDesktopOnly` accordingly.
- Prefer `async/await` over promise chains; handle errors gracefully.

## Mobile

- Where feasible, test on iOS and Android.
- Don't assume desktop-only behavior unless `isDesktopOnly` is `true`.
- Avoid large in-memory structures; be mindful of memory and storage constraints.

## Agent do/don't

**Do**
- Add commands with stable IDs (don't rename once released).
- Provide defaults and validation in settings.
- Write idempotent code paths so reload/unload doesn't leak listeners or intervals.
- Use `this.register*` helpers for everything that needs cleanup.

**Don't**
- Introduce network calls without an obvious user-facing reason and documentation.
- Ship features that require cloud services without clear disclosure and explicit opt-in.
- Store or transmit vault contents unless essential and consented.

## Common tasks

### Organize code across multiple files

**main.ts** (minimal, lifecycle only):
```ts
import { Plugin } from "obsidian";
import { MySettings, DEFAULT_SETTINGS } from "./settings";
import { registerCommands } from "./commands";

export default class MyPlugin extends Plugin {
  settings: MySettings;

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    registerCommands(this);
  }
}
```

**settings.ts**:
```ts
export interface MySettings {
  enabled: boolean;
  apiKey: string;
}

export const DEFAULT_SETTINGS: MySettings = {
  enabled: true,
  apiKey: "",
};
```

**commands/index.ts**:
```ts
import { Plugin } from "obsidian";
import { doSomething } from "./my-command";

export function registerCommands(plugin: Plugin) {
  plugin.addCommand({
    id: "do-something",
    name: "Do something",
    callback: () => doSomething(plugin),
  });
}
```

### Add a command

```ts
this.addCommand({
  id: "your-command-id",
  name: "Do the thing",
  callback: () => this.doTheThing(),
});
```

### Persist settings

```ts
interface MySettings { enabled: boolean }
const DEFAULT_SETTINGS: MySettings = { enabled: true };

async onload() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  await this.saveData(this.settings);
}
```

### Register listeners safely

```ts
this.registerEvent(this.app.workspace.on("file-open", f => { /* ... */ }));
this.registerDomEvent(window, "resize", () => { /* ... */ });
this.registerInterval(window.setInterval(() => { /* ... */ }, 1000));
```

## Troubleshooting

- Plugin doesn't load after build: ensure `main.js` and `manifest.json` are at the top level of the plugin folder under `<Vault>/.obsidian/plugins/<plugin-id>/`. 
- Build issues: if `main.js` is missing, run `npm run build` or `npm run dev` to compile your TypeScript source code.
- Commands not appearing: verify `addCommand` runs after `onload` and IDs are unique.
- Settings not persisting: ensure `loadData`/`saveData` are awaited and you re-render the UI after changes.
- Mobile-only issues: confirm you're not using desktop-only APIs; check `isDesktopOnly` and adjust.

## References

- Obsidian sample plugin: https://github.com/obsidianmd/obsidian-sample-plugin
- API documentation: https://docs.obsidian.md
- Developer policies: https://docs.obsidian.md/Developer+policies
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Style guide: https://help.obsidian.md/style-guide
