import type { TranslationKeys } from "../../i18n/en";
import { t } from "../../i18n/t";
import { formatNumber } from "../format";
import { formatMinutes } from "./sleep-card";
import type { DayIndex } from "../index";
import { average } from "../stats";
import { computeTrend, type Trend } from "../trend";
import { historyFacts, longFacts, longView, type LongView } from "../longview";
import { historyView, type HistoryView } from "../best-days";
import { bestMarker } from "../range-bar";
import { renderCard } from "./shell";
import type { Insight } from "../insights/registry";

/** Days with a stress level before the 7-day marker is shown. */
export const STRESS_MIN_DAYS = 5;
const WINDOW_DAYS = 7;

/** Garmin's bands: 0-25 rest, 26-50 low, 51-75 medium, 76-100 high. */
const BANDS: { upTo: number; label: TranslationKeys }[] = [
	{ upTo: 25, label: "panelStressRest" },
	{ upTo: 50, label: "panelStressLow" },
	{ upTo: 75, label: "panelStressMedium" },
	{ upTo: 100, label: "panelStressHigh" },
];

export interface StressModel {
	/** What the data suggests, filled in by the panel (see insights/). */
	insights: Insight[];
	trend: Trend | null;
	level: number | null;
	/** Mean of the 7 days before, or null with fewer than STRESS_MIN_DAYS. */
	week: number | null;
	/** Minutes stressed (medium and high) and minutes recovering (rest) of the day, from the sync. */
	stressed: number | null;
	recovering: number | null;
	/** The usual share of stressed minutes in stressed plus recovering minutes (0 to 1): the 7 days before, null with fewer than STRESS_MIN_DAYS of each. */
	usualShare: number | null;
	long: LongView | null;
	history: HistoryView;
}

export function computeStress(index: DayIndex, date: string): StressModel {
	const usualStressed = average(index, "stress_high", date, WINDOW_DAYS, STRESS_MIN_DAYS);
	const usualRecovering = average(index, "recovery_high", date, WINDOW_DAYS, STRESS_MIN_DAYS);
	const usualTotal = (usualStressed ?? 0) + (usualRecovering ?? 0);
	return {
		insights: [],
		trend: computeTrend((d) => index.value("stress", d), date),
		level: index.value("stress", date),
		week: average(index, "stress", date, WINDOW_DAYS, STRESS_MIN_DAYS),
		stressed: index.value("stress_high", date),
		recovering: index.value("recovery_high", date),
		long: longView((d) => index.value("stress", d), date),
		history: historyView(index, date, "stress"),
		usualShare: usualStressed === null || usualRecovering === null || usualTotal === 0 ? null : usualStressed / usualTotal,
	};
}

const pct = (v: number): number => Math.min(100, Math.max(0, v));

export function renderStress(parent: HTMLElement, model: StressModel, lang: string, explainOpen: boolean, onToggleExplain: () => void): void {
	const level = model.level;
	const band = level === null ? null : (BANDS.find((b) => level <= b.upTo) ?? BANDS[BANDS.length - 1]!);
	const value = level === null ? null : formatNumber(level, lang, 0);
	renderCard(parent, { title: t("panelStressTitle", lang), value, unit: band ? t(band.label, lang) : undefined, explain: t("panelStressExplain", lang), explainOpen, onToggleExplain, lang, insights: model.insights, facts: [...longFacts(model.long, (n) => formatNumber(n, lang, 0), lang), ...historyFacts(model.history.rank, model.history.best, (n) => formatNumber(n, lang, 0), lang)], trend: { trend: model.trend, format: (n) => formatNumber(n, lang, 0) } }, (card) => {
		if (level === null) return;
		const bar = card.createDiv({ cls: "ghs-range ghs-stress-bar", attr: { role: "img", "aria-label": `${Math.round(level)}` } });
		bar.createDiv({ cls: "ghs-range-track ghs-range-track-stress" });
		if (model.week !== null) bar.createDiv({ cls: "ghs-tick ghs-tick-solid" }).setCssProps({ "--ghs-x": `${pct(model.week)}%` });
		if (model.history.best !== null) bestMarker(bar, model.history.best, t("panelBestLabel", lang).replace("{value}", formatNumber(model.history.best, lang, 0)));
		bar.createDiv({ cls: "ghs-dot ghs-dot-neutral" }).setCssProps({ "--ghs-x": `${pct(level)}%` });
		if (model.week !== null) card.createDiv({ cls: "ghs-card-note", text: t("panelStressWeek", lang).replace("{n}", formatNumber(model.week, lang, 0)) });
		if (model.stressed !== null && model.recovering !== null && model.stressed + model.recovering > 0) {
			const total = model.stressed + model.recovering;
			const wrap = card.createDiv({ cls: "ghs-split-wrap" });
			const split = wrap.createDiv({ cls: "ghs-split", attr: { role: "img", "aria-label": `${model.stressed}/${model.recovering}` } });
			split.createDiv({ cls: "ghs-split-part ghs-split-stressed" }).setCssProps({ "--ghs-w": `${(model.stressed / total) * 100}%` });
			split.createDiv({ cls: "ghs-split-part ghs-split-recovering" }).setCssProps({ "--ghs-w": `${(model.recovering / total) * 100}%` });
			// the usual split of the days before, so a day can be read against the person's own norm
			if (model.usualShare !== null) wrap.createDiv({ cls: "ghs-tick ghs-tick-solid ghs-split-usual" }).setCssProps({ "--ghs-x": `${model.usualShare * 100}%` });
			const labels = card.createDiv({ cls: "ghs-split-labels" });
			labels.createSpan({ cls: "ghs-split-label-stressed", text: t("panelStressed", lang).replace("{time}", formatMinutes(model.stressed)) });
			labels.createSpan({ cls: "ghs-split-label-recovering", text: t("panelRecovering", lang).replace("{time}", formatMinutes(model.recovering)) });
		}
	});
}
