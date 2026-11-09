import { formatMinutes } from "../cards/sleep-card";
import { windowValues } from "../stats";
import { shiftDate } from "../../dates";
import { MAX_INSIGHTS, type Insight, type InsightId } from "./registry";
import { dryYesterday } from "./hydration";
import type { Signals } from "./signals";

const hours = (minutes: number): string => String(minutes / 60);
const pct = (share: number): string => String(Math.round(Math.abs(share) * 100));
/** A training load this far above the person's norm counts as a spike (the 'strain' zone starts at 1.3). */
const SPIKE_RATIO = 1.3;
const SLEEP_DEBT_MIN = 120;
/** The smallest spread assumed for a very steady person, as in the usual range of the cards. */
const SD_FLOOR_FOR = { hrv: 2, resting_hr: 1.5 };
/** Nights in a row below the usual HRV range that count as a pattern and not a single bad night. */
const HRV_STREAK_NIGHTS = 2;
const HRV_STREAK_LOOKBACK = 7;

/** Nights in a row, counting back from the shown one, with HRV more than one standard deviation below the person's own range. */
function lowHrvStreak(s: Signals): number {
	let n = 0;
	while (n < HRV_STREAK_LOOKBACK && (s.z("hrv", shiftDate(s.date, -n)) ?? 0) < -1) n++;
	return n;
}

/** A change of the 90-day average against the 90 days before that is at least half a standard deviation of the year (the "smallest worthwhile change" of HRV monitoring) is worth a line. */
const WORTHWHILE_SD_SHARE = 0.5;

/** `rising` is the insight for an average that went up, `falling` for one that went down. */
function longTrend(s: Signals, key: "hrv" | "resting_hr", rising: InsightId, falling: InsightId): Insight | null {
	const view = s.long(key);
	if (!view || view.recent === null || view.prior === null) return null;
	const delta = view.recent - view.prior;
	if (Math.abs(delta) < WORTHWHILE_SD_SHARE * Math.max(view.sd, SD_FLOOR_FOR[key])) return null;
	return { id: delta > 0 ? rising : falling, params: { recent: String(Math.round(view.recent * 10) / 10), delta: String(Math.round(Math.abs(delta) * 10) / 10) } };
}

export function hrvInsights(s: Signals): Insight[] {
	const z = s.z("hrv");
	if (z === null) return [];
	const out: Insight[] = [];
	if (z < -1) {
		const { ratio } = s.load();
		const { debt, need } = s.sleep();
		// the night after a hard session a low HRV is expected: that comes first, the other reasons only add to it
		if (s.hardYesterday()) out.push({ id: "hrv_low_hard_session" });
		if (ratio !== null && ratio > SPIKE_RATIO) out.push({ id: "hrv_low_load", params: { pct: pct(ratio - 1) } });
		if (debt !== null && debt >= SLEEP_DEBT_MIN) out.push({ id: "hrv_low_sleep", params: { debt: formatMinutes(debt), need: hours(need) } });
		if ((s.z("stress") ?? 0) > 1) out.push({ id: "hrv_low_stress" });
		if ((s.z("resting_hr") ?? 0) > 1 || (s.z("respiration_rate") ?? 0) > 1) out.push({ id: "hrv_low_illness" });
		if (dryYesterday(s)) out.push({ id: "hrv_low_hydration" });
		const streak = lowHrvStreak(s);
		if (out.length === 0) out.push(streak >= HRV_STREAK_NIGHTS ? { id: "hrv_low_streak", params: { n: String(streak) } } : { id: "unexplained" });
	} else if (z > 1) {
		const { ratio } = s.load();
		out.push(ratio !== null && ratio < 1 ? { id: "hrv_high_light_load", params: { pct: pct(1 - ratio) } } : { id: "hrv_high_rested" });
	} else {
		out.push({ id: "hrv_in_range" });
	}
	const trend = longTrend(s, "hrv", "hrv_trend_up", "hrv_trend_down");
	if (trend) out.push(trend);
	return out.slice(0, MAX_INSIGHTS);
}

export function restingHrInsights(s: Signals): Insight[] {
	const z = s.z("resting_hr");
	if (z === null) return [];
	const out: Insight[] = [];
	if (z > 1) {
		const { ratio } = s.load();
		const { debt } = s.sleep();
		if (s.hardYesterday()) out.push({ id: "rhr_high_hard_session" });
		if (ratio !== null && ratio > SPIKE_RATIO) out.push({ id: "rhr_high_load", params: { pct: pct(ratio - 1) } });
		if (debt !== null && debt >= SLEEP_DEBT_MIN) out.push({ id: "rhr_high_sleep", params: { debt: formatMinutes(debt) } });
		if ((s.z("hrv") ?? 0) < -1 || (s.z("respiration_rate") ?? 0) > 1) out.push({ id: "rhr_high_illness" });
		if (dryYesterday(s)) out.push({ id: "rhr_high_hydration" });
		if (out.length === 0) out.push({ id: "unexplained" });
	} else if (z < -1) {
		out.push({ id: "rhr_low_fitness" });
	} else {
		out.push({ id: "rhr_in_range" });
	}
	const trend = longTrend(s, "resting_hr", "rhr_trend_up", "rhr_trend_down");
	if (trend) out.push(trend);
	return out.slice(0, MAX_INSIGHTS);
}

/** Nights of the last 7 (the shown one included) with an average SpO2 below this count as low. */
const SPO2_LOW_NIGHT = 92;
const SPO2_REPEATED_NIGHTS = 3;

export function spo2Insights(s: Signals): Insight[] {
	const value = s.index.value("spo2", s.date);
	if (value === null) return [];
	const z = s.z("spo2");
	const out: Insight[] = [];
	const recent = windowValues(s.index, "spo2", shiftDate(s.date, 1), 7);
	const lowNights = recent.filter((v) => v < SPO2_LOW_NIGHT).length;
	const low = value < 94 || (z !== null && z < -1);
	if (lowNights >= SPO2_REPEATED_NIGHTS) out.push({ id: "spo2_low_repeated", params: { n: String(lowNights) } });
	if (low && (s.z("respiration_rate") ?? 0) > 1) out.push({ id: "spo2_low_with_breathing" });
	if (low && out.length === 0) out.push({ id: "spo2_low_single" });
	if (!low && value >= 95) out.push({ id: "spo2_ok" });
	if (!low && value < 95) out.push({ id: "spo2_usual" });
	return out.slice(0, MAX_INSIGHTS);
}

/** Breaths a minute above the person's usual that count as raised on their own. */
const BREATHING_RISE = 1.5;

export function breathingInsights(s: Signals): Insight[] {
	const z = s.z("respiration_rate");
	const delta = s.delta("respiration_rate");
	if (z === null || delta === null) return [];
	if (z > 1 || delta >= BREATHING_RISE) return [{ id: (s.z("resting_hr") ?? 0) > 1 ? "breathing_up_illness" : "breathing_up_alone" }];
	return [{ id: z < -1 ? "breathing_low" : "breathing_ok" }];
}
