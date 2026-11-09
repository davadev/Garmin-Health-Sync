import type { TranslationKeys } from "../i18n/en";
import { computeBattery, renderBattery } from "./cards/battery-card";
import { computeToday, renderToday, todayAvailability } from "./cards/today-card";
import { computeLoad, renderLoad } from "./cards/load-card";
import { computeBody, renderBody } from "./cards/body-card";
import { computeFloors, renderFloors } from "./cards/floors-card";
import { computeIntensity, renderIntensity } from "./cards/intensity-card";
import { BREATHING_CARD, HRV_CARD, RESTING_HR_CARD, SPO2_CARD, computeRange, renderRange, type RangeCardSpec } from "./cards/range-card";
import { computeSleep, renderSleep } from "./cards/sleep-card";
import { computeSessions, renderSessions } from "./cards/sessions-card";
import { computeStages, renderStages } from "./cards/stages-card";
import { computeSteps, renderSteps } from "./cards/steps-card";
import { computeStress, renderStress } from "./cards/stress-card";
import { computeVo2, renderVo2 } from "./cards/vo2-card";
import { computeWeekly, renderWeekly } from "./cards/weekly-card";
import type { HabitInfo } from "../providers/garmin/lifestyle";
import { shiftDate } from "../dates";
import type { DayIndex } from "./index";
import { bodyInsights, floorsInsights, intensityInsights, stepsInsights, vo2Insights } from "./insights/activity";
import { batteryInsights, stressInsights } from "./insights/energy";
import { withHistory } from "./insights/history";
import { hydrationInsights } from "./insights/hydration";
import { computeHydration, renderHydration } from "./cards/hydration-card";
import { computeHabitsCard, renderHabits } from "./cards/habits-card";
import { knownHabits } from "./habits";
import { breathingInsights, hrvInsights, restingHrInsights, spo2Insights } from "./insights/recovery";
import type { Insight } from "./insights/registry";
import { Signals } from "./insights/signals";
import { sleepInsights, stagesInsights } from "./insights/sleep";
import { todayInsights } from "./insights/today";
import { loadInsights, sessionsInsights, weeklyInsights } from "./insights/training";

export type SectionId = "today" | "recovery" | "sleep" | "energy" | "movement" | "fitness" | "training";

export interface CardContext {
	parent: HTMLElement;
	index: DayIndex;
	date: string;
	lang: string;
	/** The notes use miles and pounds. */
	imperial: boolean;
	/** From the settings, for the heart rate zones. */
	birthYear: number | null;
	/** The habits of the lifestyle log Garmin has sent: their names and kinds. */
	habits: Record<string, HabitInfo>;
	/** The habits the user hid in the card, and how a habit is hidden or shown again. */
	hiddenHabits: string[];
	onHideHabit: (key: string, hide: boolean) => void;
	explainOpen: boolean;
	onToggleExplain: () => void;
}

export interface PanelCard {
	id: string;
	title: TranslationKeys;
	section: SectionId;
	/** Frontmatter metrics the card needs; it is empty or partly empty until all of them are synced. None = always available (activities have no switch). */
	metrics: string[];
	/** Metrics that add detail to the card but are not required. */
	extra?: string[];
	/** The settings text: what the card needs and when it unlocks. */
	needs: TranslationKeys;
	/** Shown at half width next to the next half-width card. */
	half?: boolean;
	render: (ctx: CardContext) => void;
}

/**
 * The cards in the order the user arranged them. Cards the saved order does not know (added since) go after the card
 * that precedes them in the default order, and unknown or repeated ids are dropped.
 */
export function orderedCards(saved: string[]): PanelCard[] {
	const byId = new Map(PANEL_CARDS.map((card) => [card.id, card]));
	const order = saved.filter((id, i) => byId.has(id) && saved.indexOf(id) === i);
	PANEL_CARDS.forEach((card, i) => {
		if (order.includes(card.id)) return;
		const before = PANEL_CARDS[i - 1];
		order.splice(before ? order.indexOf(before.id) + 1 : 0, 0, card.id);
	});
	return order.map((id) => byId.get(id)!);
}

/** The interpretations of a card for the shown day. */
/** The cards of one draw share one set of signals, so the sleep and load models are worked out once, not once per card. */
const signalCache = new WeakMap<DayIndex, { version: number; date: string; birthYear: number | null; signals: Signals }>();
const signals = (c: CardContext): Signals => {
	const hit = signalCache.get(c.index);
	if (hit && hit.version === c.index.version && hit.date === c.date && hit.birthYear === c.birthYear) return hit.signals;
	const made = new Signals(c.index, c.date, c.birthYear);
	signalCache.set(c.index, { version: c.index.version, date: c.date, birthYear: c.birthYear, signals: made });
	return made;
};

const RANGE_INSIGHTS: Record<string, (s: Signals) => Insight[]> = {
	hrv: hrvInsights,
	resting_hr: restingHrInsights,
	spo2: spo2Insights,
	respiration_rate: breathingInsights,
};

const range = (spec: RangeCardSpec, section: SectionId, needs: TranslationKeys, extra?: string[]): PanelCard => ({
	id: spec.id,
	title: spec.title,
	section,
	metrics: [spec.key],
	extra,
	needs,
	half: spec.half,
	render: (c) => renderRange(c.parent, spec, { ...computeRange(spec, c.index, c.date), insights: withHistory(signals(c), spec.key, RANGE_INSIGHTS[spec.id]!(signals(c))) }, c.lang, c.explainOpen, c.onToggleExplain),
});

/** Every card of the panel in display order. Ids are stable: they are stored in the settings. */
export const PANEL_CARDS: PanelCard[] = [
	{ id: "today", title: "panelTodayTitle", section: "today", metrics: ["hrv", "resting_hr", "sleep_duration"], needs: "panelNeedsToday", extra: ["body_battery_max", "training_readiness", "spo2", "respiration_rate", "stress"], render: (c) => renderToday(c.parent, { ...computeToday(c.index, c.date, c.birthYear), insights: todayInsights(signals(c)) }, c.lang, c.explainOpen, c.onToggleExplain) },
	range(HRV_CARD, "recovery", "panelNeedsHrv", ["hydration_ml"]),
	range(RESTING_HR_CARD, "recovery", "panelNeedsRestingHr", ["hydration_ml"]),
	range(SPO2_CARD, "recovery", "panelNeedsSpo2"),
	range(BREATHING_CARD, "recovery", "panelNeedsBreathing"),
	{ id: "habits", title: "panelHabitsTitle", section: "recovery", metrics: ["lifestyle_log"], extra: ["hrv", "resting_hr"], needs: "panelNeedsHabits", render: (c) => renderHabits(c.parent, computeHabitsCard(c.index, c.date, knownHabits(c.habits, c.index.habitsInNotes()), c.hiddenHabits), c.lang, c.explainOpen, c.onToggleExplain, c.onHideHabit) },
	{ id: "sleep", title: "panelSleepTitle", section: "sleep", metrics: ["sleep_duration"], needs: "panelNeedsSleep", extra: ["sleep_score", "sleep_start", "sleep_end"], render: (c) => renderSleep(c.parent, { ...computeSleep(c.index, c.date, c.birthYear), insights: sleepInsights(signals(c)) }, c.lang, c.explainOpen, c.onToggleExplain) },
	{ id: "stages", title: "panelStagesTitle", section: "sleep", metrics: ["sleep_deep", "sleep_rem", "sleep_light", "sleep_awake"], needs: "panelNeedsStages", render: (c) => renderStages(c.parent, { ...computeStages(c.index, c.date), insights: stagesInsights(signals(c)) }, c.lang, c.explainOpen, c.onToggleExplain) },
	{ id: "battery", title: "panelBatteryTitle", section: "energy", metrics: ["body_battery_max"], needs: "panelNeedsBattery", extra: ["body_battery_min", "body_battery"], render: (c) => renderBattery(c.parent, { ...computeBattery(c.index, c.date), insights: withHistory(signals(c), "body_battery_max", batteryInsights(signals(c))) }, c.lang, c.explainOpen, c.onToggleExplain) },
	{ id: "stress", title: "panelStressTitle", section: "energy", metrics: ["stress"], needs: "panelNeedsStress", extra: ["stress_high", "recovery_high"], render: (c) => renderStress(c.parent, { ...computeStress(c.index, c.date), insights: withHistory(signals(c), "stress", stressInsights(signals(c))) }, c.lang, c.explainOpen, c.onToggleExplain) },
	{ id: "hydration", title: "panelHydrationTitle", section: "energy", metrics: ["hydration_ml"], needs: "panelNeedsHydration", extra: ["hydration_goal_ml"], render: (c) => renderHydration(c.parent, { ...computeHydration(c.index, c.date), insights: hydrationInsights(signals(c)) }, c.lang, c.explainOpen, c.onToggleExplain) },
	{ id: "steps", title: "panelStepsTitle", section: "movement", metrics: ["steps"], needs: "panelNeedsSteps", extra: ["distance_km", "calories_active", "calories_total"], render: (c) => renderSteps(c.parent, { ...computeSteps(c.index, c.date), insights: withHistory(signals(c), "steps", stepsInsights(signals(c))) }, c.lang, c.explainOpen, c.onToggleExplain) },
	{ id: "intensity", title: "panelIntensityTitle", section: "movement", metrics: ["intensity_min"], needs: "panelNeedsIntensity", render: (c) => renderIntensity(c.parent, { ...computeIntensity(c.index, c.date, c.birthYear), insights: intensityInsights(signals(c)) }, c.lang, c.explainOpen, c.onToggleExplain) },
	{ id: "floors", title: "panelFloorsTitle", section: "movement", metrics: ["floors"], needs: "panelNeedsFloors", render: (c) => renderFloors(c.parent, { ...computeFloors(c.index, c.date), insights: floorsInsights(signals(c)) }, c.lang, c.explainOpen, c.onToggleExplain) },
	{ id: "vo2", title: "panelVo2Title", section: "fitness", metrics: ["vo2_max"], needs: "panelNeedsVo2", render: (c) => renderVo2(c.parent, { ...computeVo2(c.index, c.date), insights: vo2Insights(signals(c)) }, c.lang, c.explainOpen, c.onToggleExplain) },
	{ id: "body", title: "panelBodyTitle", section: "fitness", metrics: ["weight_kg"], needs: "panelNeedsBody", extra: ["body_fat_pct"], render: (c) => renderBody(c.parent, { ...computeBody(c.index, c.date), insights: bodyInsights(signals(c)) }, c.lang, c.explainOpen, c.onToggleExplain) },
	{ id: "load", title: "panelLoadTitle", section: "training", metrics: [], extra: ["training_status"], needs: "panelNeedsLoad", render: (c) => renderLoad(c.parent, { ...computeLoad(c.index, c.date, c.birthYear), insights: loadInsights(signals(c)) }, c.lang, c.explainOpen, c.onToggleExplain) },
	{ id: "weekly", title: "panelWeeklyTitle", section: "training", metrics: [], needs: "panelNeedsWeekly", render: (c) => renderWeekly(c.parent, { ...computeWeekly(c.index, c.date), insights: weeklyInsights(signals(c)) }, c.lang, c.imperial, c.explainOpen, c.onToggleExplain) },
	{ id: "sessions", title: "panelSessionsTitle", section: "training", metrics: [], needs: "panelNeedsSessions", render: (c) => renderSessions(c.parent, { ...computeSessions(c.index, c.date, c.birthYear), insights: sessionsInsights(signals(c)) }, c.lang, c.imperial, c.explainOpen, c.onToggleExplain) },
];

/** Days back from today that are looked at for a card's data. */
const DATA_DAYS = 90;

/** Whether a card has anything to show: a value of one of the metrics it needs on one of the last 90 days, a session for the cards that read workouts, a habit for the Habits card. */
export function cardHasData(card: PanelCard, index: DayIndex, today: string, habits: Record<string, HabitInfo>): boolean {
	if (card.id === "habits") return Object.keys(habits).length > 0 || Object.keys(index.habitsInNotes()).length > 0;
	// a card that can say nothing for this data (no resting heart rate with sleep, no Garmin readiness) is not shown by data
	if (card.id === "today") {
		const available = todayAvailability(index, today);
		if (available === "none") return false;
		if (available === "garmin") return true;
	}
	for (let i = 0; i < DATA_DAYS; i++) {
		const day = shiftDate(today, -i);
		if (card.metrics.length === 0 ? index.sessions(day).length > 0 : card.metrics.some((key) => index.has(key, day))) return true;
	}
	return false;
}

export const SECTION_TITLES: Record<SectionId, TranslationKeys> = {
	today: "panelSectionToday",
	recovery: "panelSectionRecovery",
	sleep: "panelSectionSleep",
	energy: "panelSectionEnergy",
	movement: "panelSectionMovement",
	fitness: "panelSectionFitness",
	training: "panelSectionTraining",
};
