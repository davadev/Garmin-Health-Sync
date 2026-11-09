import { shiftDate } from "../dates";
import type { DayIndex } from "./index";
import { baseline } from "./stats";

/** Nights drawn on the week chart, the shown night last. */
export const WEEK_NIGHTS = 14;
/** The rolling average covers this many nights. */
export const WEEK_WINDOW = 7;
/** A rolling average is drawn from this many nights of its 7; three valid nights give a weekly mean that tracks the full week (Plews et al. 2014). */
export const WEEK_MIN_DRAWN = 3;
/** The Readiness score and flag lean on the week from this many nights of 7: stricter than the literature, because overnight values are noisier than a morning reading. */
export const WEEK_MIN_JUDGED = 4;
/** The baseline is the nights before the week: a low week must not pull down the range it is compared with. */
const BASELINE_DAYS = 60;
const BASELINE_MIN = 14;
/** Smallest spread of ln(value): about 4 percent of the level (HRV), so a very steady sleeper does not get a razor-thin band. */
export const LN_SD_FLOOR = 0.04;
/**
 * The usual range of a week is one standard deviation of the baseline, the same width as the range bar of the night, so "usual" means one thing on the card.
 * The research criterion (smallest worthwhile change, Plews et al. 2012, Javaloyes et al. 2019) is half of that; this card is deliberately less sensitive, to give fewer false alarms.
 */
export const USUAL_SD = 1;
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
	/** Rolling 7-night average ending on each night (geometric mean, in ms), null with fewer than WEEK_MIN_DRAWN nights. */
	avg: (number | null)[];
	/** Nights with a value among the 7 ending on the shown night. */
	coverage: number;
	/** Usual range for a week in ms: the baseline mean +/- one standard deviation, null while the baseline is too young. */
	band: { low: number; mean: number; high: number } | null;
	/** The 7-night average of the shown night, in ms. */
	average: number | null;
	/** Distance of the 7-night average from the baseline mean in standard deviations of ln(HRV), null below WEEK_MIN_JUDGED nights or without a baseline. */
	z: number | null;
	gaps: WeekGap[];
}

function lnOf(v: number | null): number | null {
	return v !== null && v > 0 ? Math.log(v) : null;
}

export function computeWeek(index: DayIndex, key: string, date: string, sdFloor: number = LN_SD_FLOOR): WeekModel {
	const nights: (number | null)[] = [];
	const lns: (number | null)[] = [];
	// the 6 nights before the chart's first night are needed for the first average
	for (let i = WEEK_NIGHTS + WEEK_WINDOW - 2; i >= 0; i--) {
		const v = index.value(key, shiftDate(date, -i));
		lns.push(lnOf(v));
		if (i < WEEK_NIGHTS) nights.push(lnOf(v) === null ? null : v);
	}
	const avgLn = (end: number): { mean: number; n: number } | null => {
		const used = lns.slice(end - WEEK_WINDOW + 1, end + 1).filter((v): v is number => v !== null);
		return used.length < WEEK_MIN_DRAWN ? null : { mean: used.reduce((a, b) => a + b, 0) / used.length, n: used.length };
	};
	const offset = WEEK_WINDOW - 1;
	const avg = nights.map((_, i) => {
		const a = avgLn(i + offset);
		return a === null ? null : Math.exp(a.mean);
	});

	const earlier: number[] = [];
	for (let i = WEEK_WINDOW; i < WEEK_WINDOW + BASELINE_DAYS; i++) {
		const v = lnOf(index.value(key, shiftDate(date, -i)));
		if (v !== null) earlier.push(v);
	}
	const b = baseline(earlier, BASELINE_MIN, sdFloor);
	const band = b ? { low: Math.exp(b.mean - USUAL_SD * b.sd), mean: Math.exp(b.mean), high: Math.exp(b.mean + USUAL_SD * b.sd) } : null;

	const last = avgLn(nights.length - 1 + offset);
	const coverage = nights.slice(-WEEK_WINDOW).filter((v) => v !== null).length;
	const z = b && last && coverage >= WEEK_MIN_JUDGED ? (last.mean - b.mean) / b.sd : null;

	const gaps: WeekGap[] = [];
	let run = 0;
	nights.forEach((v, i) => {
		if (v === null) run++;
		if (v !== null || i === nights.length - 1) {
			if (run >= GAP_MIN) gaps.push({ from: v === null ? i - run + 1 : i - run, length: run });
			run = 0;
		}
	});
	return { nights, avg, coverage, band, average: avg[avg.length - 1] ?? null, z, gaps };
}
