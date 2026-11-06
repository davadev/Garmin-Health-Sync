import { t } from "../../i18n/t";
import { localDateString, shiftDate } from "../../dates";
import { formatNumber } from "../format";
import type { DayIndex } from "../index";
import { average } from "../stats";
import { computeTrend, type Trend } from "../trend";
import { bestFact, historyFacts, longFacts, longView, type LongView } from "../longview";
import { historyView, type HistoryView } from "../best-days";
import { bestMarker } from "../range-bar";
import { renderCard } from "./shell";
import type { Insight } from "../insights/registry";

/** Days that must have steps among the 7 before the shown day. */
export const STEPS_MIN_DAYS = 5;
const WINDOW_DAYS = 7;
const ZONE_FACTOR = 1.1;
/** The bar spans 0 to this multiple of the usual daily steps, which pins the zone at 62.5 % to 68.75 %. */
const DOMAIN_FACTOR = 1.6;
export const STEPS_PER_MINUTE = 100;

export interface StepsModel {
	/** What the data suggests, filled in by the panel (see insights/). */
	insights: Insight[];
	trend: Trend | null;
	steps: number | null;
	have: number;
	/** The usual daily steps (7-day average) or null while too few days exist. */
	base: number | null;
	distance: { value: number; unit: "km" | "mi" } | null;
	active: { value: number; avg: number | null } | null;
	total: number | null;
	/** The last year of daily steps, null with fewer than 60 days of values. */
	long: LongView | null;
	history: HistoryView;
	/** Steps of the day before, to set an unfinished day against a whole one. */
	dayBefore: number | null;
	/** The shown day is today, so the day is not over. */
	today: boolean;
}

export function computeSteps(index: DayIndex, date: string): StepsModel {
	// an average of 0 (a watch that was off) is no usual day to set a zone on
	const mean = average(index, "steps", date, WINDOW_DAYS, STEPS_MIN_DAYS);
	const base = mean !== null && mean > 0 ? mean : null;
	let have = 0;
	for (let i = 1; i <= WINDOW_DAYS; i++) if (index.value("steps", shiftDate(date, -i)) !== null) have++;
	const km = index.value("distance_km", date);
	const mi = index.value("distance_mi", date);
	const distanceValue = km ?? mi;
	const active = index.value("calories_active", date);
	return {
		insights: [],
		trend: computeTrend((d) => index.value("steps", d), date),
		steps: index.value("steps", date),
		have,
		base,
		distance: distanceValue === null ? null : { value: distanceValue, unit: km !== null ? "km" : "mi" },
		active: active === null ? null : { value: active, avg: average(index, "calories_active", date, WINDOW_DAYS, STEPS_MIN_DAYS) },
		total: index.value("calories_total", date),
		dayBefore: index.value("steps", shiftDate(date, -1)),
		long: longView((d) => index.value("steps", d), date),
		history: historyView(index, date, "steps"),
		today: date === localDateString(new Date()),
	};
}

/** "9.1k" for thousands, the plain number below. */
function thousands(n: number, lang: string): string {
	return n >= 1000 ? `${new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n / 1000)}k` : formatNumber(n, lang, 0);
}

function chip(parent: HTMLElement, label: string, value: string, delta: number | null, lang: string): void {
	const c = parent.createDiv({ cls: "ghs-chip" });
	c.createSpan({ cls: "ghs-chip-label", text: label });
	const v = c.createDiv({ cls: "ghs-chip-value", text: value });
	if (delta !== null && Math.round(delta) !== 0) {
		const rounded = Math.round(delta);
		v.createSpan({ cls: `ghs-chip-delta ${rounded < 0 ? "ghs-chip-delta-down" : "ghs-chip-delta-up"}`, text: ` ${rounded < 0 ? "−" : "+"}${formatNumber(Math.abs(rounded), lang, 0)}` });
	}
}

export function renderSteps(parent: HTMLElement, model: StepsModel, lang: string, explainOpen: boolean, onToggleExplain: () => void): void {
	const value = model.steps === null ? null : formatNumber(model.steps, lang, 0);
	renderCard(parent, { title: t("panelStepsTitle", lang), value, explain: t("panelStepsExplain", lang), explainOpen, onToggleExplain, lang, insights: model.insights, facts: [...longFacts(model.long, (n) => formatNumber(n, lang, 0), lang), ...historyFacts(model.history.rank, lang)], bestFact: bestFact(model.history.best, (n) => formatNumber(n, lang, 0), lang), trend: { trend: model.trend, format: (n) => formatNumber(n, lang, 0) } }, (card) => {
		if (model.base === null) {
			card.createDiv({ cls: "ghs-card-note", text: t("panelLocked", lang).replace("{need}", String(STEPS_MIN_DAYS)).replace("{have}", String(model.have)) });
			return;
		}
		const zoneTop = model.base * ZONE_FACTOR;
		const domain = model.base * DOMAIN_FACTOR;
		if (model.steps !== null) {
			const bar = card.createDiv({ cls: "ghs-range ghs-range-labelled ghs-steps-bar", attr: { role: "img", "aria-label": `${thousands(model.base, lang)}–${thousands(zoneTop, lang)}` } });
			bar.createDiv({ cls: "ghs-range-track ghs-range-track-steps" });
			bar.createDiv({ cls: "ghs-zone" });
			const labels = bar.createDiv({ cls: "ghs-range-labels" });
			labels.createSpan({ cls: "ghs-tick-label", text: thousands(model.base, lang) }).setCssProps({ "--ghs-x": "62.5%" });
			labels.createSpan({ cls: "ghs-tick-label", text: thousands(zoneTop, lang) }).setCssProps({ "--ghs-x": "68.75%" });
			const x = Math.min(100, Math.max(0, (model.steps / domain) * 100));
			if (model.history.best !== null) bestMarker(bar, (model.history.best / domain) * 100, t("panelBestLabel", lang).replace("{value}", formatNumber(model.history.best, lang, 0)));
			bar.createDiv({ cls: `ghs-dot ${model.steps >= model.base ? "ghs-dot-ok" : "ghs-dot-warn"}` }).setCssProps({ "--ghs-x": `${x}%` });
			const foot = card.createDiv({ cls: "ghs-foot" });
			foot.createSpan({ cls: "ghs-foot-label", text: t(model.today ? "panelToTopOfZoneSoFar" : "panelToTopOfZone", lang) });
			const left = Math.ceil(zoneTop - model.steps);
			foot.createSpan({
				cls: `ghs-foot-value${left <= 0 ? " ghs-foot-good" : ""}`,
				text: left <= 0 ? t("panelZoneDone", lang) : t("panelStepsToGo", lang).replace("{steps}", formatNumber(left, lang, 0)).replace("{min}", String(Math.ceil(left / STEPS_PER_MINUTE))),
			});
		}
		const chips = card.createDiv({ cls: "ghs-chips" });
		if (model.distance) {
			chip(chips, t("panelDistance", lang), `${formatNumber(model.distance.value, lang)} ${model.distance.unit}`, null, lang);
		}
		if (model.active) chip(chips, t("panelActive", lang), formatNumber(model.active.value, lang, 0), model.active.avg === null ? null : model.active.value - model.active.avg, lang);
		if (model.total !== null) chip(chips, t("panelTotalKcal", lang), formatNumber(model.total, lang, 0), null, lang);
		if (model.dayBefore !== null) chip(chips, t("panelDayBefore", lang), formatNumber(model.dayBefore, lang, 0), model.dayBefore - model.base, lang);
		if (!chips.hasChildNodes()) chips.remove();
	});
}
