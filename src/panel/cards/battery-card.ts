import { t } from "../../i18n/t";
import { formatNumber } from "../format";
import type { DayIndex } from "../index";
import { average, windowValues } from "../stats";
import { computeTrend, type Trend } from "../trend";
import { bestFact, historyFacts, longFacts, longView, type LongView } from "../longview";
import { historyView, type HistoryView } from "../best-days";
import { bestMarker } from "../range-bar";
import { renderCard } from "./shell";
import type { Insight } from "../insights/registry";

/** Days with a peak before the usual peak is shown, and before it is called reliable. */
export const BATTERY_EARLY_MIN_DAYS = 5;
export const BATTERY_MIN_DAYS = 14;
const WINDOW_DAYS = 30;

export interface BatteryModel {
	/** What the data suggests, filled in by the panel (see insights/). */
	insights: Insight[];
	trend: Trend | null;
	max: number | null;
	min: number | null;
	charged: number | null;
	/** 30-day mean of the daily peak. */
	usualPeak: number | null;
	/** The lowest and highest daily peak of the last 30 days: the range your peaks usually fall in. */
	usualRange: { low: number; high: number } | null;
	/** 30-day mean of the overnight charge. */
	usualCharged: number | null;
	/** Days with a peak in the window. */
	have: number;
	long: LongView | null;
	history: HistoryView;
}

export function computeBattery(index: DayIndex, date: string): BatteryModel {
	const peaks = windowValues(index, "body_battery_max", date, WINDOW_DAYS);
	const enough = peaks.length >= BATTERY_EARLY_MIN_DAYS;
	return {
		insights: [],
		trend: computeTrend((d) => index.value("body_battery_max", d), date),
		max: index.value("body_battery_max", date),
		min: index.value("body_battery_min", date),
		charged: index.value("body_battery", date),
		usualPeak: enough ? peaks.reduce((a, b) => a + b, 0) / peaks.length : null,
		usualRange: enough ? { low: Math.min(...peaks), high: Math.max(...peaks) } : null,
		usualCharged: average(index, "body_battery", date, WINDOW_DAYS, BATTERY_EARLY_MIN_DAYS),
		have: peaks.length,
		long: longView((d) => index.value("body_battery_max", d), date),
		history: historyView(index, date, "body_battery_max"),
	};
}

const pct = (v: number): number => Math.min(100, Math.max(0, v));

export function renderBattery(parent: HTMLElement, model: BatteryModel, lang: string, explainOpen: boolean, onToggleExplain: () => void): void {
	const value = model.max === null ? null : formatNumber(model.max, lang, 0);
	renderCard(parent, { title: t("panelBatteryTitle", lang), value, unit: t("panelBatteryUnit", lang), explain: t("panelBatteryExplain", lang), explainOpen, onToggleExplain, lang, insights: model.insights, facts: [...longFacts(model.long, (n) => formatNumber(n, lang, 0), lang), ...historyFacts(model.history.rank, lang)], bestFact: bestFact(model.history.best, (n) => formatNumber(n, lang, 0), lang), trend: { trend: model.trend, format: (n) => formatNumber(n, lang, 0) } }, (card) => {
		if (model.max === null) return;
		// Two bars on the same 0 to 100 scale: where your daily peaks usually fall, and today.
		if (model.usualRange !== null && model.usualPeak !== null) {
			const row = card.createDiv({ cls: "ghs-battery-row" });
			const head = row.createDiv({ cls: "ghs-battery-row-head" });
			head.createSpan({ cls: "ghs-battery-row-label", text: t("panelBatteryUsualRow", lang) });
			head.createSpan({ text: `${formatNumber(model.usualRange.low, lang, 0)}–${formatNumber(model.usualRange.high, lang, 0)}` });
			const usual = row.createDiv({ cls: "ghs-battery-bar" });
			usual.createDiv({ cls: "ghs-battery-track" });
			usual.createDiv({ cls: "ghs-battery-usual" }).setCssProps({ "--ghs-x": `${pct(model.usualRange.low)}%`, "--ghs-w": `${pct(model.usualRange.high) - pct(model.usualRange.low)}%` });
			usual.createDiv({ cls: "ghs-tick ghs-tick-solid" }).setCssProps({ "--ghs-x": `${pct(model.usualPeak)}%` });
		}
		const low = model.min ?? model.max;
		const today = card.createDiv({ cls: "ghs-battery-row" });
		const head = today.createDiv({ cls: "ghs-battery-row-head" });
		head.createSpan({ cls: "ghs-battery-row-label", text: t("panelBatteryToday", lang) });
		head.createSpan({ text: model.min === null ? formatNumber(model.max, lang, 0) : `${formatNumber(model.min, lang, 0)} → ${formatNumber(model.max, lang, 0)}` });
		const bar = today.createDiv({ cls: "ghs-battery-bar", attr: { role: "img", "aria-label": `${low}–${model.max}` } });
		bar.createDiv({ cls: "ghs-battery-track" });
		if (model.history.best !== null) bestMarker(bar, pct(model.history.best), t("panelBestLabel", lang).replace("{value}", formatNumber(model.history.best, lang, 0)));
		bar.createDiv({ cls: "ghs-battery-fill" }).setCssProps({ "--ghs-x": `${pct(low)}%`, "--ghs-w": `${pct(model.max) - pct(low)}%` });
		if (model.charged !== null) {
			const foot = card.createDiv({ cls: "ghs-foot" });
			foot.createSpan({ cls: "ghs-foot-label", text: t("panelRecharged", lang) });
			const charged = formatNumber(model.charged, lang, 0);
			foot.createSpan({
				cls: "ghs-foot-value",
				text: model.usualCharged === null ? t("panelRechargedNoUsual", lang).replace("{charged}", charged) : t("panelRechargedUsual", lang).replace("{charged}", charged).replace("{usual}", formatNumber(model.usualCharged, lang, 0)),
			});
		}
		if (model.usualPeak !== null && model.have < BATTERY_MIN_DAYS) {
			card.createDiv({ cls: "ghs-card-note ghs-card-warning", text: t("panelEarly", lang).replace("{have}", String(model.have)).replace("{need}", String(BATTERY_MIN_DAYS)) });
		}
	});
}
