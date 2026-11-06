import { t } from "../i18n/t";
import { RESTING_HR_CARD, HRV_CARD, renderRange, type RangeModel } from "../panel/cards/range-card";
import { baseline } from "../panel/stats";

/**
 * Small illustrations for the "what's new" window, drawn with the real side panel code and styles instead of shipped
 * as images: they follow the user's theme and language, add nothing to the plugin's size and cannot go stale. They are
 * decoration (hidden from screen readers, not clickable); the text of the item carries the meaning.
 */
export type FigureId = "panel" | "light-bulb" | "history" | "properties" | "backfill" | "commands";

const noop = (): void => undefined;
/** Ten ordinary mornings, so the card has a usual range to draw. */
const USUAL = [58, 62, 60, 57, 61, 59, 63, 60, 56, 62];

function model(value: number, insights: RangeModel["insights"], key: "hrv" | "resting_hr"): RangeModel {
	const base = key === "hrv" ? USUAL : USUAL.map((v) => v - 7);
	return { insights, value, have: USUAL.length, baseline: baseline(base, 5, key === "hrv" ? 2 : 1.5), early: false, z: null, trend: null, long: null, history: { rank: null, best: null } };
}

/** A settings row as Obsidian draws it: the name on the left, a control on the right. */
function settingRow(parent: HTMLElement, name: string, control: (el: HTMLElement) => void): void {
	const row = parent.createDiv({ cls: "setting-item ghs-fig-setting" });
	row.createDiv({ cls: "setting-item-info" }).createDiv({ cls: "setting-item-name", text: name });
	control(row.createDiv({ cls: "setting-item-control" }));
}

function dropdown(parent: HTMLElement, label: string): void {
	const select = parent.createEl("select", { cls: "dropdown", attr: { disabled: "" } });
	select.createEl("option", { text: label });
}

/** A framed part of a figure with a small title, so settings and the panel are not mistaken for one screen. */
function frame(parent: HTMLElement, title: string): HTMLElement {
	const box = parent.createDiv({ cls: "ghs-fig-frame" });
	box.createDiv({ cls: "ghs-fig-label", text: title });
	return box;
}

function toggle(control: HTMLElement, on: boolean): void {
	control.createDiv({ cls: `checkbox-container${on ? " is-enabled" : ""}` });
}

/** Two places: the settings, where the panel and each card are switched on, and the panel that then shows the cards. */
function panelFigure(fig: HTMLElement, lang: string): void {
	const settings = frame(fig, t("settingsPanel", lang));
	settingRow(settings, t("settingsPanelShow", lang), (control) => toggle(control, true));
	settingRow(settings, t("panelHrvTitle", lang), (control) => toggle(control, true));
	settingRow(settings, t("panelHydrationTitle", lang), (control) => toggle(control, false));
	fig.createDiv({ cls: "ghs-fig-arrow", text: "↓" });
	const panel = frame(fig, t("panelTitle", lang));
	renderRange(panel.createDiv({ cls: "ghs-panel ghs-fig-panel" }), HRV_CARD, model(61, [], "hrv"), lang, false, noop);
}

function lightBulbFigure(fig: HTMLElement, lang: string): void {
	renderRange(fig.createDiv({ cls: "ghs-panel ghs-fig-panel" }), RESTING_HR_CARD, model(56, [{ id: "rhr_high_hydration" }], "resting_hr"), lang, true, noop);
}

function historyFigure(fig: HTMLElement, lang: string): void {
	settingRow(fig, t("settingsMissingNote", lang), (control) => dropdown(control, t("missingNoteHistory", lang)));
	fig.createDiv({ cls: "ghs-fig-file", text: "Garmin history 2026-10.md" });
}

/** A column of properties as thin bars: many for a long note, few once the Garmin ones are hidden. */
function bars(parent: HTMLElement, count: number): void {
	const stack = parent.createDiv({ cls: "ghs-fig-bars" });
	for (let i = 0; i < count; i++) stack.createDiv({ cls: `ghs-fig-bar${i % 4 === 0 ? " is-long" : ""}` });
}

function propertiesFigure(fig: HTMLElement, lang: string): void {
	settingRow(fig, t("settingsProperties", lang), (control) => dropdown(control, t("propertiesFoldHide", lang)));
	const compare = fig.createDiv({ cls: "ghs-fig-compare" });
	for (const [label, count] of [["whatsNewBefore", 16], ["whatsNewNow", 3]] as const) {
		const side = compare.createDiv({ cls: "ghs-fig-side" });
		side.createDiv({ cls: "ghs-fig-label", text: t(label, lang) });
		bars(side, count);
	}
}

/** What a running backfill shows: the notice at the top with its text and Stop button, and the status bar item. */
function backfillFigure(fig: HTMLElement, lang: string): void {
	const notice = fig.createDiv({ cls: "ghs-fig-notice" });
	const text = t("historyProgress", lang).replace("{date}", "2026-10-14").replace("{done}", "3").replace("{total}", "8").replace("{eta}", "4 min");
	notice.createDiv({ text });
	notice.createEl("button", { text: t("historyStop", lang) });
	fig.createDiv({ cls: "ghs-fig-statusbar", text: t("historyStatusBar", lang).replace("{percent}", "38") });
}

/** The commands that are new since the last stable release, as the command palette lists them, each with what it does. */
function commandsFigure(fig: HTMLElement, lang: string): void {
	for (const [name, what] of [["commandOpenPanel", "whatsNewCmdOpenPanel"], ["commandBackfill", "whatsNewCmdBackfill"], ["commandImportHistory", "whatsNewCmdImportHistory"], ["commandShowProgress", "whatsNewCmdShowProgress"]] as const) {
		const row = fig.createDiv({ cls: "ghs-fig-command" });
		row.createDiv({ cls: "ghs-fig-command-name", text: t(name, lang) });
		row.createDiv({ cls: "ghs-fig-command-what", text: t(what, lang) });
	}
}

/** Draws the illustration `id` into `parent`. */
export function renderFigure(parent: HTMLElement, id: FigureId, lang: string): HTMLElement {
	const fig = parent.createDiv({ cls: `ghs-whats-new-figure ghs-fig-${id}`, attr: { "aria-hidden": "true" } });
	if (id === "panel") panelFigure(fig, lang);
	else if (id === "light-bulb") lightBulbFigure(fig, lang);
	else if (id === "history") historyFigure(fig, lang);
	else if (id === "properties") propertiesFigure(fig, lang);
	else if (id === "backfill") backfillFigure(fig, lang);
	else commandsFigure(fig, lang);
	return fig;
}
