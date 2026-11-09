// Renders the scenes of the documentation with the plugin's own panel code and writes each as an HTML file next to
// a manifest. scripts/render-screenshots.mjs turns them into PNGs with the real styles.css. Run through
// `npm run screenshots`; it is not part of the normal test run (tests/**/*.test.ts only).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it, vi } from "vitest";
import { App, WorkspaceLeaf } from "../mocks/obsidian";
import { notesOfLine } from "../../src/release-notes";

/** A version above every entry: the notes of the newest entry only, so the image shows the window of the release in the making and cannot go stale. */
const NEWEST = "999.0.0";
import { WhatsNewModal } from "../../src/ui/whats-new-modal";
import { HealthPanelView } from "../../src/panel/view";
import { PANEL_CARDS } from "../../src/panel/cards";
import { DEFAULT_SETTINGS } from "../../src/settings";
import { t } from "../../src/i18n/t";
import { shiftDate } from "../../src/dates";
import { seedHistory } from "../fakeHistory";
import { IMAGE_WIDTH, SCENES } from "./scenes";
import { SERIES_DAYS, SERIES_END, frontmatterAt, generateSeries } from "./synthetic";

const OUT = process.env["SCREENSHOT_OUT"] ?? path.resolve(import.meta.dirname, ".out");

it("renders every scene", async () => {
	mkdirSync(OUT, { recursive: true });
	const series = generateSeries();
	const manifest: { id: string; file: string; theme: string; width: number; error: string | null }[] = [];
	for (const scene of SCENES) {
		let error: string | null = null;
		try {
			vi.useFakeTimers();
			const shown = shiftDate(SERIES_END, -scene.daysBack);
			// the panel opens on today; the morning after the shown day, one step back lands on the shown day
			vi.setSystemTime(new Date(`${shiftDate(shown, 1)}T09:00:00`));
			if (scene.kind === "whats-new") {
				const modal = new WhatsNewModal(new App() as never, scene.language, notesOfLine(NEWEST));
				modal.open();
				for (const selector of scene.expect) if (!modal.contentEl.querySelector(selector)) throw new Error(`scene ${scene.id}: nothing matches ${selector}`);
				writeFileSync(path.join(OUT, `${scene.id}.html`), `<div class="modal ghs-whats-new-modal"><div class="modal-content">${modal.contentEl.innerHTML}</div></div>`);
				manifest.push({ id: scene.id, file: scene.file, theme: scene.theme, width: scene.width ?? IMAGE_WIDTH, error: null });
				continue;
			}
			const app = new App();
			await seedHistory(app, { end: shown, days: SERIES_DAYS - scene.daysBack, frontmatter: frontmatterAt(series, scene.daysBack) });
			const panelCards = Object.fromEntries(PANEL_CARDS.map((c) => [c.id, scene.cards.includes(c.id)]));
			const settings = { ...DEFAULT_SETTINGS, language: scene.language, birthYear: 1986, panelCards };
			const view = new HealthPanelView(new WorkspaceLeaf(app) as never, { settings } as never);
			await view.onOpen();
			(view.contentEl.querySelector(".ghs-daynav button") as HTMLButtonElement).click();
			await vi.advanceTimersByTimeAsync(0);
			for (const id of scene.open) {
				const card = PANEL_CARDS.find((c) => c.id === id)!;
				const title = t(card.title, scene.language);
				const target = Array.from(view.contentEl.querySelectorAll(".ghs-card")).find((c) => c.querySelector(".ghs-card-title")?.textContent === title);
				if (!target) throw new Error(`scene ${scene.id}: no card ${id}`);
				(target.querySelector(".ghs-info") as HTMLButtonElement).click();
				await vi.advanceTimersByTimeAsync(0);
			}
			for (const selector of scene.expect) if (!view.contentEl.querySelector(selector)) throw new Error(`scene ${scene.id}: nothing matches ${selector}`);
			if (view.contentEl.querySelector(".ghs-card-empty")) throw new Error(`scene ${scene.id}: a card has no reading`);
			writeFileSync(path.join(OUT, `${scene.id}.html`), view.contentEl.outerHTML);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			vi.useRealTimers();
		}
		manifest.push({ id: scene.id, file: scene.file, theme: scene.theme, width: scene.width ?? IMAGE_WIDTH, error });
	}
	writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
});
