import type { TranslationKeys } from "../../i18n/en";
import { t } from "../../i18n/t";
import { weekdayName } from "../format";

/** "watch": something is off and the text says why and what helps. "good": something is good and, where the data allows, why. */
export type InsightKind = "watch" | "good";

/**
 * Every interpretation the panel can show under a card's light bulb button. Each id has a text `insight_<id>` in the six
 * languages and a section in docs/panel-insights.md that says how it is triggered and what it rests on
 * (tests/panelInsightsDocs.test.ts enforces both).
 */
export const INSIGHTS = {
	unexplained: { card: "any", kind: "watch" },
	history_top: { card: "any", kind: "good" },
	history_bottom: { card: "any", kind: "watch" },

	today_flag_hrv: { card: "today", kind: "watch" },
	today_flag_rhr: { card: "today", kind: "watch" },
	today_flag_sleep: { card: "today", kind: "watch" },
	today_flag_battery: { card: "today", kind: "watch" },
	today_flag_stress: { card: "today", kind: "watch" },
	today_flag_breathing: { card: "today", kind: "watch" },
	today_flag_spo2: { card: "today", kind: "watch" },
	today_flag_load: { card: "today", kind: "watch" },
	today_no_flags: { card: "today", kind: "good" },
	today_hard_session: { card: "today", kind: "watch" },
	today_no_hrv: { card: "today", kind: "watch" },
	today_week_low: { card: "today", kind: "watch" },

	hrv_low_load: { card: "hrv", kind: "watch" },
	hrv_low_sleep: { card: "hrv", kind: "watch" },
	hrv_low_stress: { card: "hrv", kind: "watch" },
	hrv_low_illness: { card: "hrv", kind: "watch" },
	hrv_low_hydration: { card: "hrv", kind: "watch" },
	hrv_low_streak: { card: "hrv", kind: "watch" },
	hrv_low_hard_session: { card: "hrv", kind: "watch" },
	hrv_high_light_load: { card: "hrv", kind: "good" },
	hrv_high_rested: { card: "hrv", kind: "good" },
	hrv_trend_down: { card: "hrv", kind: "watch" },
	hrv_trend_up: { card: "hrv", kind: "good" },
	hrv_in_range: { card: "hrv", kind: "good" },

	rhr_high_load: { card: "resting_hr", kind: "watch" },
	rhr_high_sleep: { card: "resting_hr", kind: "watch" },
	rhr_high_illness: { card: "resting_hr", kind: "watch" },
	rhr_high_hydration: { card: "resting_hr", kind: "watch" },
	rhr_high_hard_session: { card: "resting_hr", kind: "watch" },
	rhr_low_fitness: { card: "resting_hr", kind: "good" },
	rhr_trend_up: { card: "resting_hr", kind: "watch" },
	rhr_trend_down: { card: "resting_hr", kind: "good" },
	rhr_in_range: { card: "resting_hr", kind: "good" },

	spo2_low_repeated: { card: "spo2", kind: "watch" },
	spo2_low_with_breathing: { card: "spo2", kind: "watch" },
	spo2_low_single: { card: "spo2", kind: "watch" },
	spo2_ok: { card: "spo2", kind: "good" },
	spo2_usual: { card: "spo2", kind: "good" },

	breathing_up_illness: { card: "respiration_rate", kind: "watch" },
	breathing_up_alone: { card: "respiration_rate", kind: "watch" },
	breathing_ok: { card: "respiration_rate", kind: "good" },
	breathing_low: { card: "respiration_rate", kind: "good" },

	sleep_short_late_bed: { card: "sleep", kind: "watch" },
	sleep_short_early_wake: { card: "sleep", kind: "watch" },
	sleep_short_average: { card: "sleep", kind: "watch" },
	sleep_short_plain: { card: "sleep", kind: "watch" },
	sleep_debt_high: { card: "sleep", kind: "watch" },
	sleep_irregular: { card: "sleep", kind: "watch" },
	sleep_regular_good: { card: "sleep", kind: "good" },
	sleep_enough_good: { card: "sleep", kind: "good" },

	deep_low_inactive: { card: "stages", kind: "watch" },
	deep_low_fragmented: { card: "stages", kind: "watch" },
	deep_low_timing: { card: "stages", kind: "watch" },
	rem_low_early_wake: { card: "stages", kind: "watch" },
	rem_low_short_night: { card: "stages", kind: "watch" },
	awake_high_stress: { card: "stages", kind: "watch" },
	awake_high_breathing: { card: "stages", kind: "watch" },
	stages_deep_active: { card: "stages", kind: "good" },
	stages_typical: { card: "stages", kind: "good" },

	battery_low_sleep: { card: "battery", kind: "watch" },
	battery_low_stress: { card: "battery", kind: "watch" },
	battery_low_load: { card: "battery", kind: "watch" },
	battery_recharge_good: { card: "battery", kind: "good" },
	battery_usual: { card: "battery", kind: "good" },

	stress_more_stressed: { card: "stress", kind: "watch" },
	stress_high_sleep: { card: "stress", kind: "watch" },
	stress_high_week: { card: "stress", kind: "watch" },
	stress_calm: { card: "stress", kind: "good" },
	stress_usual: { card: "stress", kind: "good" },
	stress_above_week: { card: "stress", kind: "watch" },
	stress_high_usual: { card: "stress", kind: "watch" },

	hydration_goal_good: { card: "hydration", kind: "good" },
	hydration_on_pace: { card: "hydration", kind: "good" },
	hydration_behind_pace: { card: "hydration", kind: "watch" },
	hydration_below_goal: { card: "hydration", kind: "watch" },
	hydration_low_streak: { card: "hydration", kind: "watch" },
	hydration_training_day: { card: "hydration", kind: "watch" },
	hydration_weekday_low: { card: "hydration", kind: "watch" },

	lifestyle_hrv_up: { card: "habits", kind: "good" },
	lifestyle_hrv_down: { card: "habits", kind: "watch" },
	lifestyle_rhr_down: { card: "habits", kind: "good" },
	lifestyle_rhr_up: { card: "habits", kind: "watch" },
	lifestyle_hrv_dose_up: { card: "habits", kind: "good" },
	lifestyle_hrv_dose_down: { card: "habits", kind: "watch" },
	lifestyle_rhr_dose_down: { card: "habits", kind: "good" },
	lifestyle_rhr_dose_up: { card: "habits", kind: "watch" },
	lifestyle_no_days: { card: "habits", kind: "watch" },

	steps_below_streak: { card: "steps", kind: "watch" },
	steps_to_go: { card: "steps", kind: "watch" },
	steps_zone_good: { card: "steps", kind: "good" },
	steps_in_zone: { card: "steps", kind: "good" },
	steps_weekday_low: { card: "steps", kind: "watch" },

	floors_below_streak: { card: "floors", kind: "watch" },
	floors_zone_good: { card: "floors", kind: "good" },
	floors_to_go: { card: "floors", kind: "watch" },

	intensity_behind: { card: "intensity", kind: "watch" },
	intensity_goal_good: { card: "intensity", kind: "good" },

	vo2_down_volume: { card: "vo2", kind: "watch" },
	vo2_down_other: { card: "vo2", kind: "watch" },
	vo2_up_good: { card: "vo2", kind: "good" },
	vo2_steady: { card: "vo2", kind: "good" },

	body_fast: { card: "body", kind: "watch" },
	body_stable: { card: "body", kind: "good" },

	load_overreach: { card: "load", kind: "watch" },
	load_strain: { card: "load", kind: "watch" },
	load_detrain: { card: "load", kind: "watch" },
	load_maintain: { card: "load", kind: "good" },
	load_build: { card: "load", kind: "good" },

	weekly_over_cap: { card: "weekly", kind: "watch" },
	weekly_on_track: { card: "weekly", kind: "good" },
	weekly_room: { card: "weekly", kind: "good" },

	sessions_all_hard: { card: "sessions", kind: "watch" },
	sessions_mostly_easy: { card: "sessions", kind: "good" },
	sessions_balanced: { card: "sessions", kind: "good" },
} as const satisfies Record<string, { card: string; kind: InsightKind }>;

export type InsightId = keyof typeof INSIGHTS;

export interface Insight {
	id: InsightId;
	/** Values for the {placeholders} of the text, already formatted. */
	params?: Record<string, string>;
}

/** The text of an insight in the plugin language with its values filled in. */
export function insightText(insight: Insight, lang: string): string {
	let text = t(`insight_${insight.id}` as TranslationKeys, lang);
	for (const [key, value] of Object.entries(insight.params ?? {})) text = text.split(`{${key}}`).join(value);
	// "dayOf" is a date: the text names its weekday in the language it is shown in
	const dayOf = insight.params?.["dayOf"];
	return dayOf === undefined ? text : text.split("{day}").join(weekdayName(dayOf, lang));
}

/** At most this many interpretations per card, so the light bulb section stays short. */
export const MAX_INSIGHTS = 3;
