// Why it matters: the what's new window shows small illustrations drawn with the real panel code. They are the
// part of the window that tells a user where to switch things on, so every one must draw, in every language, and
// must stay decoration (hidden from screen readers) that cannot be clicked into a changed setting.
import { describe, expect, it } from "vitest";
import { renderFigure, type FigureId } from "../src/ui/whats-new-figures";
import { WhatsNewModal } from "../src/ui/whats-new-modal";
import { notesOfLine } from "../src/release-notes";
import { App } from "../testUtils/mocks/obsidian";
import { en } from "../src/i18n/en";
import { de } from "../src/i18n/de";

/** Every figure; a new one has to be listed here, so it cannot ship undrawn. */
const FIGURE_IDS: FigureId[] = ["panel", "light-bulb", "history", "properties", "backfill", "commands", "best-days", "hrv-week"];
const draw = (id: FigureId, lang = "en"): HTMLElement => renderFigure(document.createElement("div"), id, lang);

describe("what's new figures", () => {
	it.each(FIGURE_IDS)("%s draws something and is hidden from screen readers", (id) => {
		const fig = draw(id);
		expect(fig.getAttribute("aria-hidden")).toBe("true");
		expect(fig.classList.contains(`ghs-fig-${id}`)).toBe(true);
		expect(fig.childElementCount).toBeGreaterThan(0);
	});

	it("keeps the settings and the panel apart: the switches in one frame, a real card in another", () => {
		const fig = draw("panel");
		const [settings, panel] = Array.from(fig.querySelectorAll(".ghs-fig-frame")) as HTMLElement[];
		expect(settings!.querySelector(".ghs-fig-label")?.textContent).toBe(en.settingsPanel);
		expect(Array.from(settings!.querySelectorAll(".setting-item-name")).map((n) => n.textContent)).toEqual([en.settingsPanelShow, en.panelHrvTitle, en.panelHydrationTitle]);
		expect(Array.from(settings!.querySelectorAll(".checkbox-container")).map((c) => c.classList.contains("is-enabled"))).toEqual([true, true, false]);
		expect(settings!.querySelector(".ghs-card")).toBeNull();
		expect(panel!.querySelector(".ghs-fig-label")?.textContent).toBe(en.panelTitle);
		expect(panel!.querySelector(".setting-item")).toBeNull();
		expect(fig.querySelector(".ghs-card-title")?.textContent).toBe(en.panelHrvTitle);
		expect(fig.querySelector(".ghs-range")).not.toBeNull();
	});

	it("ignores a click on the light bulb of a figure: it is decoration", () => {
		const fig = draw("panel");
		(fig.querySelector(".ghs-info") as HTMLButtonElement).click();
		expect(fig.querySelector(".ghs-insight")).toBeNull();
	});

	it("shows the notice of a running backfill with its stop button and the status bar text", () => {
		const fig = draw("backfill");
		expect(fig.querySelector(".ghs-fig-notice div")?.textContent).toBe("Backfill · 2026-10-14 · 3 of 8 days · about 4 min left");
		expect(fig.querySelector(".ghs-fig-notice button")?.textContent).toBe(en.historyStop);
		expect(fig.querySelector(".ghs-fig-statusbar")?.textContent).toBe("Backfill 38%");
	});

	it("lists the commands that are new since the last stable release, named as in the palette, each with what it does", () => {
		expect(Array.from(draw("commands").querySelectorAll(".ghs-fig-command-name")).map((c) => c.textContent)).toEqual([en.commandOpenPanel, en.commandBackfill, en.commandImportHistory, en.commandShowProgress]);
		expect(Array.from(draw("commands").querySelectorAll(".ghs-fig-command-what")).map((c) => c.textContent)).toEqual([en.whatsNewCmdOpenPanel, en.whatsNewCmdBackfill, en.whatsNewCmdImportHistory, en.whatsNewCmdShowProgress]);
		expect(draw("commands", "de").querySelector(".ghs-fig-command-name")?.textContent).toBe(de.commandOpenPanel);
	});

	it("shows an open light bulb with what the data suggests", () => {
		const fig = draw("light-bulb");
		expect(fig.querySelector(".ghs-insight-item")?.textContent).toBe(en.insight_rhr_high_hydration);
		expect(fig.querySelector(".ghs-card-title")?.textContent).toBe(en.panelRestingHrTitle);
	});

	it("shows an HRV card with the diamond of the personal best next to the ring of the day", () => {
		const fig = draw("best-days");
		expect(fig.querySelector(".ghs-card-title")?.textContent).toBe(en.panelHrvTitle);
		expect(fig.querySelector(".ghs-best")).not.toBeNull();
		expect(fig.querySelector(".ghs-dot")).not.toBeNull();
		expect(fig.querySelector(".ghs-best")!.getAttribute("title")).toBe("Best days: 61 ms");
		expect(draw("best-days", "de").querySelector(".ghs-best")!.getAttribute("title")).toContain("61 ms");
	});

	it("shows the HRV week chart with the average under the usual band", () => {
		const fig = draw("hrv-week");
		expect(fig.querySelectorAll(".ghs-hrvweek .ghs-night-bar")).toHaveLength(14);
		expect(fig.querySelector(".ghs-hrvweek-band")).not.toBeNull();
		expect(fig.querySelector(".ghs-hrvweek-below")).not.toBeNull();
		expect(fig.querySelectorAll("polyline").length).toBeGreaterThan(0);
	});

	it("is drawn under the first item of the 0.14.0 notes", () => {
		const notes = notesOfLine("0.14.0");
		expect(notes[0]!.items.map((i) => i.figure)).toEqual(["hrv-week", undefined, undefined]);
		const modal = new WhatsNewModal(new App() as never, "en", notes);
		modal.open();
		expect(modal.contentEl.querySelectorAll(".ghs-fig-hrv-week")).toHaveLength(1);
	});

	it("is drawn under the first item of the 0.13.0 notes", () => {
		const notes = notesOfLine("0.13.0");
		const modal = new WhatsNewModal(new App() as never, "en", notes);
		modal.open();
		expect(notes[0]!.items.map((i) => i.figure)).toEqual(["best-days", undefined, undefined]);
		expect(modal.contentEl.querySelectorAll(".ghs-fig-best-days")).toHaveLength(1);
	});

	it("shows the setting for days without a note with the history choice", () => {
		const fig = draw("history");
		expect(fig.querySelector(".setting-item-name")?.textContent).toBe(en.settingsMissingNote);
		expect(fig.querySelector("select option")?.textContent).toBe(en.missingNoteHistory);
		expect(fig.querySelector(".ghs-fig-file")?.textContent).toContain("Garmin history");
	});

	it("shows the properties setting and a long list against a short one", () => {
		const fig = draw("properties");
		expect(fig.querySelector(".setting-item-name")?.textContent).toBe(en.settingsProperties);
		expect(fig.querySelector("select option")?.textContent).toBe(en.propertiesFoldHide);
		const lists = Array.from(fig.querySelectorAll(".ghs-fig-bars")).map((l) => l.childElementCount);
		expect(lists).toEqual([16, 3]);
		expect(Array.from(fig.querySelectorAll(".ghs-fig-label")).map((l) => l.textContent)).toEqual([en.whatsNewBefore, en.whatsNewNow]);
	});

	it("speaks the user's language", () => {
		expect(draw("panel", "de").querySelector(".setting-item-name")?.textContent).toBe(de.settingsPanelShow);
		expect(draw("properties", "de").querySelector(".ghs-fig-label")?.textContent).toBe(de.whatsNewBefore);
	});

	it("is drawn under every item of the 0.12.0 notes that names one, and nowhere else", () => {
		const modal = new WhatsNewModal(new App() as never, "en", notesOfLine("0.12.0"));
		modal.open();
		const notes = notesOfLine("0.12.0");
		const wanted = notes.flatMap((n) => n.items.map((i) => i.figure).filter(Boolean));
		expect(wanted.length).toBeGreaterThan(0);
		expect(Array.from(modal.contentEl.querySelectorAll(".ghs-whats-new-figure")).map((f) => FIGURE_IDS.find((id) => f.classList.contains(`ghs-fig-${id}`)))).toEqual(wanted);
	});
});
