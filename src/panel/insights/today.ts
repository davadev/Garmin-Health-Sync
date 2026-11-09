import { computeToday, type FlagId } from "../cards/today-card";
import { formatMinutes } from "../cards/sleep-card";
import { MAX_INSIGHTS, type Insight, type InsightId } from "./registry";
import type { Signals } from "./signals";

const FLAG_INSIGHT: Record<FlagId, InsightId> = {
	hrv: "today_flag_hrv",
	rhr: "today_flag_rhr",
	sleep: "today_flag_sleep",
	battery: "today_flag_battery",
	stress: "today_flag_stress",
	breathing: "today_flag_breathing",
	spo2: "today_flag_spo2",
	load: "today_flag_load",
};

/** One line per flag that shaped the verdict, or a note that nothing stands out. */
export function todayInsights(s: Signals): Insight[] {
	const m = computeToday(s.index, s.date, s.birthYear);
	if (m.score === null) return [];
	// the morning after a hard session comes first: it says why HRV and resting heart rate are not held against the day
	const hard: Insight[] = m.facts.hard ? [{ id: "today_hard_session" }] : [];
	if (m.flags.length === 0) return m.facts.hard ? hard : [{ id: "today_no_flags" }];
	const out = m.flags.map((flag): Insight => {
		const id = FLAG_INSIGHT[flag];
		if (flag === "hrv" && m.facts.hrvWeek?.low) return { id: "today_week_low", params: { avg: String(Math.round(m.facts.hrvWeek.average)), n: String(m.facts.hrvWeek.nights) } };
		if (flag === "sleep") return { id, params: { debt: formatMinutes(m.facts.debt!) } };
		if (flag === "battery") return { id, params: { gap: String(Math.round(m.facts.batteryGap!)) } };
		if (flag === "load") return { id, params: { pct: String(Math.round((m.facts.loadRatio! - 1) * 100)) } };
		return { id };
	});
	return [...hard, ...out].slice(0, MAX_INSIGHTS);
}
