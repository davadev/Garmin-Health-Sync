import { localDateString } from "../dates";
import type { DayIndex } from "./index";

/** The metrics that make a good day, and which way is better. */
const BEST_METRICS = [
	{ key: "hrv", better: "high" },
	{ key: "resting_hr", better: "low" },
	{ key: "stress", better: "low" },
	{ key: "sleep_score", better: "high" },
	{ key: "body_battery_max", better: "high" },
	{ key: "spo2", better: "high" },
	{ key: "steps", better: "high" },
] as const;

/** A day counts when it has at least this many of the metrics. */
const MIN_METRICS = 3;
/** Days with at least that many metrics and the metric itself before its personal best is shown. */
const MIN_CANDIDATES = 14;
/** The best days that are averaged: this share of the candidates, but not fewer than 5 and not more than 30. */
const TOP_SHARE = 0.05;
const MIN_TOP = 5;
const MAX_TOP = 30;
/** Days with a value before the rank among all days means something, and the share at either end that is worth a line. */
const MIN_RANKED = 180;
export const RANK_TAIL = 0.1;

/** Metrics that are not complete until the day is over (a sum, a peak, a day average): the day in progress is not ranked. */
const GROWS_THROUGH_DAY = new Set(["steps", "body_battery_max", "stress"]);

export interface HistoryRank {
	/** The share (0 to 1) of the person's earlier days that the shown day beats, in the direction that is better for the metric. */
	share: number;
	/** Days it was ranked among, and the day of the first of them. */
	n: number;
	since: string;
}

interface Analysis {
	best: Map<string, number>;
	ranks: Map<string, HistoryRank>;
}

/** Where `x` ranks among the sorted `values` (0 to 1): the values below it plus half of those equal to it. */
function rankIn(x: number, sorted: number[]): number {
	const bound = (strict: boolean): number => {
		let lo = 0;
		let hi = sorted.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (strict ? sorted[mid]! < x : sorted[mid]! <= x) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	};
	const below = bound(true);
	return (below + (bound(false) - below) / 2) / sorted.length;
}

function analyse(index: DayIndex, date: string): Analysis {
	const dates = index.dates().filter((d) => d < date);
	const series = BEST_METRICS.map((m) => dates.map((d) => index.value(m.key, d)));
	const sorted = series.map((values) => values.filter((v): v is number => v !== null).sort((a, b) => a - b));

	// every day: how far up its own days each of its values is, in the better direction
	const days: { score: number; count: number; values: (number | null)[] }[] = [];
	dates.forEach((_, i) => {
		let sum = 0;
		let count = 0;
		let weakest = 1;
		BEST_METRICS.forEach((m, k) => {
			const v = series[k]![i]!;
			if (v === null) return;
			const rank = rankIn(v, sorted[k]!);
			const good = m.better === "high" ? rank : 1 - rank;
			sum += good;
			count++;
			weakest = Math.min(weakest, good);
		});
		// the average and the weakest metric count half each: one great value cannot make a good day of a day that was bad elsewhere
		days.push({ score: count === 0 ? 0 : (sum / count + weakest) / 2, count, values: BEST_METRICS.map((_m, k) => series[k]![i]!) });
	});

	const best = new Map<string, number>();
	const ranks = new Map<string, HistoryRank>();
	BEST_METRICS.forEach((m, k) => {
		// a metric the person has only for a few weeks (a new watch) is searched in those weeks, one they have for years in all of them
		const candidates = days.filter((d) => d.count >= MIN_METRICS && d.values[k] !== null);
		if (candidates.length >= MIN_CANDIDATES) {
			const top = candidates.sort((a, b) => b.score - a.score).slice(0, Math.min(MAX_TOP, Math.max(MIN_TOP, Math.ceil(candidates.length * TOP_SHARE))));
			best.set(m.key, top.reduce((a, d) => a + d.values[k]!, 0) / top.length);
		}
		const value = index.value(m.key, date);
		if (value !== null && sorted[k]!.length >= MIN_RANKED && !(GROWS_THROUGH_DAY.has(m.key) && date === localDateString(new Date()))) {
			const rank = rankIn(value, sorted[k]!);
			ranks.set(m.key, { share: m.better === "high" ? rank : 1 - rank, n: sorted[k]!.length, since: dates[series[k]!.findIndex((v) => v !== null)]! });
		}
	});
	return { best, ranks };
}

const cache = new WeakMap<DayIndex, { version: number; date: string; analysis: Analysis }>();

/** Worked out once per draw for all cards, from the days before the shown day. */
function analysis(index: DayIndex, date: string): Analysis {
	const hit = cache.get(index);
	if (hit && hit.version === index.version && hit.date === date) return hit.analysis;
	const made = analyse(index, date);
	cache.set(index, { version: index.version, date, analysis: made });
	return made;
}

/**
 * What the metric averages on the person's best days before `date`, or null (no such metric, too few days). The best
 * days are found on all metrics together (see docs/personal-best.md), not on this one alone.
 */
export function personalBest(index: DayIndex, date: string, key: string): number | null {
	return analysis(index, date).best.get(key) ?? null;
}

/** Where the shown day's value stands among all earlier days of the person, or null (no such metric, no value, too few days). */
export function historyRank(index: DayIndex, date: string, key: string): HistoryRank | null {
	return analysis(index, date).ranks.get(key) ?? null;
}

/** What a card says about all the days of the person: where the shown day ranks and what their best days average. */
export interface HistoryView {
	rank: HistoryRank | null;
	best: number | null;
}

export function historyView(index: DayIndex, date: string, key: string): HistoryView {
	return { rank: historyRank(index, date, key), best: personalBest(index, date, key) };
}
