import type { TranslationKeys } from "../../i18n/en";
import { t } from "../../i18n/t";
import { formatNumber } from "../format";
import type { DayIndex } from "../index";
import { rangeBar } from "../range-bar";
import { renderCard } from "./shell";
import { computeTrend, type Trend } from "../trend";
import { bestFact, historyFacts, longFacts, longView, type LongView } from "../longview";
import { historyView, type HistoryView } from "../best-days";
import { baseline, windowValues, zScore, type Baseline } from "../stats";
import type { Insight } from "../insights/registry";
import { computeWeek, type WeekModel } from "../week";
import { renderWeek, type LongChange } from "../week-chart";

/** Window and days needed for a reliable personal range (spec: about 21 of the last 30). */
export const RANGE_WINDOW_DAYS = 30;
export const RANGE_MIN_DAYS = 21;
/** From this many days on the range is shown, marked as an early estimate (new watch, few days of data). */
export const RANGE_EARLY_MIN_DAYS = 5;

type Tone = "ok" | "warn" | "bad";

/** A card that compares one daily metric with the personal average of the 30 days before the shown day. */
export interface RangeCardSpec {
	id: string;
	/** Frontmatter key, without prefix. */
	key: string;
	title: TranslationKeys;
	explain: TranslationKeys;
	unit: string;
	sided: "both" | "high" | "low";
	/** Shown at half width next to its partner: a compact bar and a status word instead of the tick numbers. */
	half?: boolean;
	/** Decimals of the value. */
	digits: number;
	/** Smallest standard deviation used, so a very stable user does not get a razor-thin band. */
	sdFloor: number;
	/** Draws the last 14 nights with their 7-night average and the usual range of a week instead of the two-week trend line. */
	week?: { sdFloor: number; headline: TranslationKeys; bad: "low" | "high" };
	tone: (value: number, b: Baseline) => Tone;
}

function twoSided(value: number, b: Baseline): Tone {
	const a = Math.abs(zScore(value, b));
	return a <= 1 ? "ok" : a < 2 ? "warn" : "bad";
}

/** Only a value above the usual is a warning; a lower resting heart rate is fine. */
function highIsBad(value: number, b: Baseline): Tone {
	const delta = value - b.mean;
	const z = zScore(value, b);
	return z > 2 || delta >= 5 ? "bad" : z > 1 || delta >= 3 ? "warn" : "ok";
}

export const HRV_CARD: RangeCardSpec = { id: "hrv", key: "hrv", title: "panelHrvTitle", explain: "panelHrvExplain", unit: "ms", sided: "both", digits: 0, sdFloor: 2, week: { sdFloor: 0.04, headline: "panelLastNight", bad: "low" }, tone: twoSided };
export const RESTING_HR_CARD: RangeCardSpec = { id: "resting_hr", key: "resting_hr", title: "panelRestingHrTitle", explain: "panelRestingHrExplain", unit: "bpm", sided: "high", digits: 0, sdFloor: 1.5, week: { sdFloor: 0.03, headline: "panelWeekToday", bad: "high" }, tone: highIsBad };

/** Below the personal range is a warning; below 90 percent is one regardless of history. */
function spo2Tone(value: number, b: Baseline): Tone {
	if (value < 90) return "bad";
	if (value < 94) return "warn";
	const z = zScore(value, b);
	return z < -2 ? "bad" : z < -1 ? "warn" : "ok";
}

/** About 1.5 breaths a minute above the usual is an early sign worth noticing. */
function breathingTone(value: number, b: Baseline): Tone {
	const z = zScore(value, b);
	return z > 2 || z < -2 ? "bad" : Math.abs(z) > 1 || value - b.mean >= 1.5 ? "warn" : "ok";
}

export const SPO2_CARD: RangeCardSpec = { id: "spo2", key: "spo2", title: "panelSpo2Title", explain: "panelSpo2Explain", unit: "%", sided: "low", half: true, digits: 0, sdFloor: 0.7, tone: spo2Tone };
export const BREATHING_CARD: RangeCardSpec = { id: "respiration_rate", key: "respiration_rate", title: "panelBreathingTitle", explain: "panelBreathingExplain", unit: "/min", sided: "both", half: true, digits: 1, sdFloor: 0.4, tone: breathingTone };

export interface RangeModel {
	/** What the data suggests, filled in by the panel (see insights/). */
	insights: Insight[];
	value: number | null;
	/** Days with a reading in the window. */
	have: number;
	baseline: Baseline | null;
	/** The range rests on fewer than RANGE_MIN_DAYS days and is likely inaccurate. */
	early: boolean;
	/** Distance from the personal mean in standard deviations. */
	z: number | null;
	trend: Trend | null;
	/** The last year of the metric, null with fewer than 60 days of values. */
	long: LongView | null;
	history: HistoryView;
	/** The shown day. */
	date: string;
	/** The last 14 nights and their 7-night average, only for a card with `week`. */
	week: WeekModel | null;
}

export function computeRange(spec: RangeCardSpec, index: DayIndex, date: string): RangeModel {
	const values = windowValues(index, spec.key, date, RANGE_WINDOW_DAYS);
	const b = baseline(values, RANGE_EARLY_MIN_DAYS, spec.sdFloor);
	const value = index.value(spec.key, date);
	return { insights: [], value, have: values.length, baseline: b, early: values.length < RANGE_MIN_DAYS, z: value !== null && b ? zScore(value, b) : null, trend: computeTrend((d) => index.value(spec.key, d), date), long: longView((d) => index.value(spec.key, d), date), history: historyView(index, date, spec.key), date, week: spec.week ? computeWeek(index, spec.key, date, spec.week.sdFloor) : null };
}

/** A change of the 90 day average smaller than this share of the usual swing is no change. */
const LONG_WORTHWHILE_SD = 0.5;

function longChange(long: LongView | null, sdFloor: number): LongChange | null {
	if (!long || long.recent === null || long.prior === null) return null;
	const delta = long.recent - long.prior;
	return { delta, steady: Math.abs(delta) < LONG_WORTHWHILE_SD * Math.max(long.sd, sdFloor) };
}

/** A range card: the day's value against the personal range, with the explanation behind a light bulb button. */
export function renderRange(parent: HTMLElement, spec: RangeCardSpec, model: RangeModel, lang: string, explainOpen: boolean, onToggleExplain: () => void): void {
	const value = model.value === null ? null : formatNumber(model.value, lang, spec.digits);
	renderCard(parent, { title: t(spec.title, lang), value, unit: model.week && spec.week ? `${spec.unit} · ${t(spec.week.headline, lang)}` : spec.unit, unitKeepCase: model.week !== null, explain: t(spec.explain, lang), explainOpen, onToggleExplain, lang, insights: model.insights, facts: [...longFacts(model.long, (n) => `${formatNumber(n, lang, spec.digits)} ${spec.unit}`, lang), ...historyFacts(model.history.rank, lang)], bestFact: bestFact(model.history.best, (n) => `${formatNumber(n, lang, spec.digits)} ${spec.unit}`, lang), trend: model.week ? undefined : { trend: model.trend, format: (n) => `${formatNumber(n, lang, spec.digits)} ${spec.unit}` } }, (card) => {
		const b = model.baseline;
		if (!b) {
			card.createDiv({
				cls: "ghs-card-note",
				text: t("panelLocked", lang).replace("{need}", String(RANGE_EARLY_MIN_DAYS)).replace("{have}", String(model.have)),
			});
			return;
		}
		const label = t("panelUsualRange", lang)
			.replace("{low}", formatNumber(b.mean - b.sd, lang, spec.digits))
			.replace("{high}", formatNumber(b.mean + b.sd, lang, spec.digits))
			.replace("{unit}", spec.unit);
		if (model.value !== null) {
			const tone = spec.tone(model.value, b);
			rangeBar(card, { value: model.value, mean: b.mean, sd: b.sd, sided: spec.sided, tone, label, lang, labels: !spec.half, best: model.history.best === null ? undefined : { value: model.history.best, label: t("panelBestLabel", lang).replace("{value}", `${formatNumber(model.history.best, lang, spec.digits)} ${spec.unit}`) } });
			if (spec.half) {
				const word = tone === "ok" ? "panelInRange" : model.value > b.mean ? "panelHigh" : "panelLow";
				card.createDiv({ cls: `ghs-status ghs-status-${tone}`, text: t(word, lang) });
			}
		} else {
			card.createDiv({ cls: "ghs-card-note", text: label });
		}
		if (model.week && spec.week) renderWeek(card, model.week, model.date, lang, { unit: spec.unit, headline: t(spec.week.headline, lang), bad: spec.week.bad, long: longChange(model.long, spec.sdFloor) });
		const streak = model.insights.find((i) => i.id === "hrv_low_streak");
		if (streak) card.createDiv({ cls: "ghs-card-note ghs-card-alert", text: t("panelHrvStreak", lang).replace("{n}", String(streak.params?.n)) });
		if (model.early) {
			card.createDiv({
				cls: "ghs-card-note ghs-card-warning",
				text: t("panelEarly", lang).replace("{have}", String(model.have)).replace("{need}", String(RANGE_MIN_DAYS)),
			});
		}
	});
}
