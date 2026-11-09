import { shiftDate } from "../dates";
import type { DayIndex } from "./index";
import { baseline, windowValues } from "./stats";

/** Nights drawn on the week chart, the shown night last. */
export const WEEK_NIGHTS = 14;
/** The rolling average covers this many nights. */
export const WEEK_WINDOW = 7;
/** A rolling average is drawn from this many nights of its 7; three valid nights give a weekly mean that tracks the full week (Plews et al. 2014). */
export const WEEK_MIN_DRAWN = 3;
/** The Readiness score and flag lean on the week from this many nights of 7: stricter than the literature, because overnight values are noisier than a morning reading. */
export const WEEK_MIN_JUDGED = 4;
/**
 * The usual range of a week is the range bar's own: the mean and standard deviation of the 30 days before the shown day, from 5 days on, so the bar and the
 * chart can never disagree. The 7 nights of the week are part of those 30 (a low week softens the range it is judged by a little). The research criterion
 * (smallest worthwhile change, Plews et al. 2012, Javaloyes et al. 2019) is half a standard deviation; this card is deliberately less sensitive, for fewer false alarms.
 */
/** The usual range is one standard deviation either side of the mean, as on the range bar. */
export const USUAL_SD = 1;
const BASELINE_DAYS = 30;
const BASELINE_MIN = 5;
/** A run of this many nights without a value is drawn as a gap. */
const GAP_MIN = 3;

export interface WeekGap {
	/** Index into `nights` of the first missing night. */
	from: number;
	length: number;
}

export interface WeekModel {
	/** The last 14 nights, oldest first, null where the watch recorded none. */
	nights: (number | null)[];
	/** Rolling 7-night average ending on each night (mean), null with fewer than WEEK_MIN_DRAWN nights. */
	avg: (number | null)[];
	/** Nights with a value among the 7 ending on the shown night. */
	coverage: number;
	/** Usual range: the baseline mean +/- one standard deviation, as on the range bar; null while the baseline is too young. */
	band: { low: number; mean: number; high: number } | null;
	/** The 7-night average of the shown night, in ms. */
	average: number | null;
	/** Distance of the 7-night average from the baseline mean in standard deviations of the baseline, null below WEEK_MIN_JUDGED nights or without a baseline. */
	z: number | null;
	gaps: WeekGap[];
}

export function computeWeek(index: DayIndex, key: string, date: string, sdFloor: number): WeekModel {
	const nights: (number | null)[] = [];
	const values: (number | null)[] = [];
	// the 6 nights before the chart's first night are needed for the first average
	for (let i = WEEK_NIGHTS + WEEK_WINDOW - 2; i >= 0; i--) {
		const v = index.value(key, shiftDate(date, -i));
		const valid = v !== null && v > 0 ? v : null;
		values.push(valid);
		if (i < WEEK_NIGHTS) nights.push(valid);
	}
	const offset = WEEK_WINDOW - 1;
	const avgAt = (end: number): number | null => {
		const used = values.slice(end - WEEK_WINDOW + 1, end + 1).filter((v): v is number => v !== null);
		return used.length < WEEK_MIN_DRAWN ? null : used.reduce((a, b) => a + b, 0) / used.length;
	};
	const avg = nights.map((_, i) => avgAt(i + offset));

	const b = baseline(windowValues(index, key, date, BASELINE_DAYS), BASELINE_MIN, sdFloor);
	const band = b ? { low: b.mean - USUAL_SD * b.sd, mean: b.mean, high: b.mean + USUAL_SD * b.sd } : null;
	const average = avg[avg.length - 1] ?? null;
	const coverage = nights.slice(-WEEK_WINDOW).filter((v) => v !== null).length;
	const z = b && average !== null && coverage >= WEEK_MIN_JUDGED ? (average - b.mean) / b.sd : null;

	const gaps: WeekGap[] = [];
	let run = 0;
	nights.forEach((v, i) => {
		if (v === null) run++;
		if (v !== null || i === nights.length - 1) {
			if (run >= GAP_MIN) gaps.push({ from: v === null ? i - run + 1 : i - run, length: run });
			run = 0;
		}
	});
	return { nights, avg, coverage, band, average, z, gaps };
}
