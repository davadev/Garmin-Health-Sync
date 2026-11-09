import { t } from "../../i18n/t";
import type { TranslationKeys } from "../../i18n/en";
import { formatNumber } from "../format";
import { insightText, type Insight } from "../insights/registry";
import { Signals } from "../insights/signals";
import { pairedDays, windowValues } from "../stats";
import { shiftDate } from "../../dates";
import { USUAL_SD } from "../week";
import type { DayIndex } from "../index";
import { computeBattery } from "./battery-card";
import { computeStress } from "./stress-card";
import { renderCard } from "./shell";

/** Days of HRV, resting heart rate and sleep needed for an own score, and for a reliable one. */
export const TODAY_MIN_DAYS = 5;
export const TODAY_RELIABLE_DAYS = 21;
/** The nights the sleep debt is summed over. */
const SLEEP_NIGHTS = 7;

export type FlagId = "hrv" | "rhr" | "sleep" | "battery" | "stress" | "breathing" | "spo2" | "load";
export type Verdict = "hard" | "planned" | "easy" | "rest";
/** 0 poor (0-29), 1 low (30-49), 2 moderate (50-69), 3 high (70-89), 4 prime (90-100). */
export type Band = 0 | 1 | 2 | 3 | 4;

const BANDS: { upTo: number; name: TranslationKeys }[] = [
	{ upTo: 30, name: "panelBandPoor" },
	{ upTo: 50, name: "panelBandLow" },
	{ upTo: 70, name: "panelBandModerate" },
	{ upTo: 90, name: "panelBandHigh" },
	{ upTo: Infinity, name: "panelBandPrime" },
];

/** What the flags found, for the interpretation: the sleep debt, how far the battery peak fell short, the load spike. */
export interface TodayFacts {
	/** The 7-night HRV average in ms and the nights it rests on, null while the week cannot be judged. */
	hrvWeek: { average: number; nights: number; low: boolean } | null;
	/** Yesterday held a hard session: the night after it, low HRV and a raised resting heart rate are expected. */
	hard: boolean;
	debt: number | null;
	batteryGap: number | null;
	loadRatio: number | null;
}

export interface TodayModel {
	insights: Insight[];
	/** Own readiness score from 0 to 100, null while HRV, resting heart rate or sleep are missing. */
	score: number | null;
	band: Band | null;
	verdict: Verdict | null;
	flags: FlagId[];
	facts: TodayFacts;
	/** Garmin's own readiness for the day, if the watch provides it. */
	garmin: number | null;
	/** Nights with a sleep duration among the last 7 (the shown one included): the debt rests on these, a night without data counts as no debt. */
	sleepNights: number;
	/** The fewest days of HRV and resting heart rate and nights of sleep, for the unlock message. */
	have: number;
	/** Days of both HRV and resting heart rate in the last 30 days. */
	baselineDays: number;
	/** The watch sends no HRV: the score rests on resting heart rate, sleep and body battery only, is less reliable and never says train hard. */
	reduced: boolean;
	/** The score rests on fewer than TODAY_RELIABLE_DAYS days of HRV and resting heart rate. */
	early: boolean;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Where a day with no sign of strain or of a good recovery lands: the lower end of "moderate" would call every ordinary day tired. */
const NEUTRAL_SCORE = 60;
/** Weight of one standard deviation of the resting heart rate in the score without HRV (7 with it). */
const REDUCED_RHR_WEIGHT = -12;

/** The average of 7 nights swings less than one night, so its distance from the usual counts double in the score. */
const SWC_PER_SD = 2;
/** The week is low when its average is below the usual range of a week (one standard deviation, the edge of the band on the HRV card). */
const WEEK_LOW_Z = -USUAL_SD;
/** A single night this far below the usual is flagged unless a hard session explains it. */
const NIGHT_LOW_Z = -2;

/**
 * Own readiness: 60 + 10 z(HRV; twice the distance of the 7-night average when there are 4 nights, else the night) - 7 z(resting heart rate) - 4 per hour of sleep debt (at most 3 h) + 0.25 (battery peak - usual,
 * between -8 and +8), 0 to 100. The z values are held between -2 and 2: HRV and resting heart rate move together, so a
 * far-out pair is one signal counted twice. Everything that depends on the usual range is scaled by `trust`, which
 * is below 1 while that range rests on fewer than 21 days, so a young range pulls the score towards the neutral
 * value instead of swinging it: a new watch with 12 days of HRV is the case this is for.
 */
function scoreOf(hrvZ: number | null, rhrZ: number, debtMin: number, peakGap: number | null, trust: number): number {
	// without HRV the resting heart rate carries both weights, so the score keeps a range of its own
	const body = hrvZ === null ? REDUCED_RHR_WEIGHT * clamp(rhrZ, -2, 2) : 10 * clamp(hrvZ, -2, 2) - 7 * clamp(rhrZ, -2, 2);
	const signal = body - 4 * Math.min(debtMin / 60, 3) + (peakGap === null ? 0 : clamp(0.25 * peakGap, -8, 8));
	return Math.round(clamp(NEUTRAL_SCORE + trust * signal, 0, 100));
}

/** The verdict follows the band and the number of flags; a pair of raised breathing and resting heart rate means rest. A low band alone means rest only once the usual range is reliable. */
function verdictOf(band: Band, flags: FlagId[], early: boolean, hard: boolean, reduced: boolean): Verdict {
	if (flags.length >= 3 || (flags.includes("breathing") && flags.includes("rhr"))) return "rest";
	if (band <= 1) return early ? "easy" : "rest";
	// the morning after a hard session the body is not ready for another: an easy day, however good the score
	if (hard) return "easy";
	// without HRV there is too little to call for a hard session: the best it says is as planned
	if (band >= 3) return flags.length === 0 ? (reduced ? "planned" : "hard") : flags.length === 1 ? "planned" : "easy";
	return flags.length === 0 ? "planned" : "easy";
}

export function computeToday(index: DayIndex, date: string, birthYear: number | null): TodayModel {
	const s = new Signals(index, date, birthYear);
	const sleep = s.sleep();
	const battery = computeBattery(index, date);
	const stress = computeStress(index, date);
	const nightZ = s.z("hrv");
	const week = s.week();
	const hard = s.hardYesterday();
	// the week, when 4 of its 7 nights have a value; else the night. A night without a value is never a low one.
	const hrvZ = week.z !== null ? SWC_PER_SD * week.z : nightZ;
	const rhrZ = s.z("resting_hr");
	// days on which both were measured: two ranges that cover different weeks (a watch that changed in between) are not one usual range
	// a watch that sends no HRV at all: the score rests on the resting heart rate alone
	const reduced = nightZ === null && windowValues(index, "hrv", date, 30).length === 0 && index.value("hrv", date) === null;
	const baselineDays = reduced ? windowValues(index, "resting_hr", date, 30).length : pairedDays(index, ["hrv", "resting_hr"], date, 30);
	const loadRatio = s.load().ratio;
	const batteryGap = battery.max !== null && battery.usualPeak !== null ? battery.usualPeak - battery.max : null;
	// the debt is counted against the usual sleep of the person, not against the general need, which a person who never reaches it would owe every day
	const debt = sleep.personalDebt;
	const facts: TodayFacts = { hrvWeek: week.z !== null && week.average !== null ? { average: week.average, nights: week.coverage, low: week.z < WEEK_LOW_Z } : null, hard, debt, batteryGap, loadRatio };

	const flags: FlagId[] = [];
	const breathingUp = (s.z("respiration_rate") ?? 0) > 1.5;
	if (week.z !== null ? week.z < WEEK_LOW_Z || (nightZ !== null && nightZ < NIGHT_LOW_Z && !hard) : nightZ !== null && nightZ < -1 && !hard) flags.push("hrv");
	// a raised resting heart rate after a hard session is expected, unless the breathing is up as well: that pair is the sign of an illness and stays
	if (rhrZ !== null && rhrZ > 1 && (!hard || breathingUp)) flags.push("rhr");
	if (debt !== null && debt > 120) flags.push("sleep");
	if (batteryGap !== null && batteryGap > 15) flags.push("battery");
	if (stress.level !== null && stress.week !== null && stress.level > stress.week + 10) flags.push("stress");
	if (breathingUp) flags.push("breathing");
	const spo2 = index.value("spo2", date);
	if (spo2 !== null && spo2 < 94) flags.push("spo2");
	if (loadRatio !== null && loadRatio > 1.5) flags.push("load");

	const garmin = index.value("training_readiness", date);
	const early = baselineDays < TODAY_RELIABLE_DAYS;
	const trust = Math.min(1, baselineDays / TODAY_RELIABLE_DAYS);
	// no score from a range too young to lean on, nor without last night's sleep: a missing night would count as no debt and raise the score
	// without last night's HRV there is no score, however many nights of the week there are: the week is no stand-in for a night that was not measured
	const score = (reduced || (hrvZ !== null && nightZ !== null)) && rhrZ !== null && debt !== null && sleep.minutes !== null && baselineDays >= TODAY_MIN_DAYS ? scoreOf(reduced ? null : hrvZ, rhrZ, debt, battery.usualPeak !== null && battery.max !== null ? battery.max - battery.usualPeak : null, trust) : null;
	const band = score === null ? null : ((BANDS.findIndex((b) => score < b.upTo) as Band));
	return { insights: [], score, band, verdict: band === null ? null : verdictOf(band, flags, early, hard, reduced), flags, facts, garmin, have: Math.min(baselineDays, sleep.have), sleepNights: sleep.have, baselineDays, early, reduced };
}

const VERDICT_TEXT: Record<Verdict, TranslationKeys> = { hard: "panelVerdictHard", planned: "panelVerdictPlanned", easy: "panelVerdictEasy", rest: "panelVerdictRest" };

export function renderToday(parent: HTMLElement, model: TodayModel, lang: string, explainOpen: boolean, onToggleExplain: () => void): void {
	const own = model.score !== null && model.band !== null;
	const value = own ? String(model.score) : model.garmin !== null ? formatNumber(model.garmin, lang, 0) : undefined;
	const unit = own ? t(BANDS[model.band!]!.name, lang) : model.garmin !== null ? "Garmin" : undefined;
	renderCard(parent, { title: t("panelTodayTitle", lang), value, unit, explain: t("panelTodayExplain", lang), explainOpen, onToggleExplain, lang, insights: model.insights }, (card) => {
		if (!own) {
			card.createDiv({
				cls: "ghs-card-note",
				text: model.garmin !== null ? t("panelTodayBridge", lang) : model.have >= TODAY_MIN_DAYS ? t("panelTodayWaiting", lang) : t("panelLocked", lang).replace("{need}", String(TODAY_MIN_DAYS)).replace("{have}", String(model.have)),
			});
			return;
		}
		card.addClass(`ghs-card-verdict-${model.verdict}`);
		card.createDiv({ cls: "ghs-verdict", text: t(VERDICT_TEXT[model.verdict!], lang) });
		const bar = card.createDiv({ cls: "ghs-range ghs-readiness-bar", attr: { role: "img", "aria-label": `${model.score}` } });
		bar.createDiv({ cls: "ghs-range-track ghs-range-track-readiness" });
		bar.createDiv({ cls: "ghs-dot ghs-dot-neutral" }).setCssProps({ "--ghs-x": `${model.score}%` });
		// the first interpretation says why the verdict is what it is, without opening the light bulb
		const why = model.insights[0];
		if (why) card.createDiv({ cls: "ghs-card-note ghs-card-why", text: insightText(why, lang) });
		if (model.garmin !== null) {
			const foot = card.createDiv({ cls: "ghs-foot" });
			foot.createSpan({ cls: "ghs-foot-label", text: t("panelTodayGarmin", lang) });
			foot.createSpan({ cls: "ghs-foot-value", text: formatNumber(model.garmin, lang, 0) });
		}
		if (model.sleepNights < SLEEP_NIGHTS) {
			card.createDiv({ cls: "ghs-card-note ghs-card-warning", text: t("panelSleepDebtPartial", lang).replace("{have}", String(model.sleepNights)).replace("{need}", String(SLEEP_NIGHTS)) });
		}
		if (model.early) {
			card.createDiv({ cls: "ghs-card-note ghs-card-warning", text: t("panelEarly", lang).replace("{have}", String(model.baselineDays)).replace("{need}", String(TODAY_RELIABLE_DAYS)) });
		}
	});
}

/** What the Today card can show for this data. */
export type TodayAvailability = "full" | "reduced" | "garmin" | "unknown" | "none";

/** Days of data of the last 90 needed before a card is called empty for good: with less the data may simply not have arrived yet. */
const JUDGE_DAYS = 14;
const AVAILABILITY_DAYS = 90;
const ANY_DATA_KEYS = ["sleep_duration", "resting_hr", "hrv", "steps", "stress", "body_battery_max"];

/**
 * "full": HRV, resting heart rate and sleep; "reduced": resting heart rate and sleep without HRV; "garmin": only Garmin's own
 * readiness; "none": the data has plenty of days but nothing the card can use; "unknown": too little data yet to tell.
 */
export function todayAvailability(index: DayIndex, today: string): TodayAvailability {
	let basics = 0;
	let hrvDays = 0;
	let garmin = false;
	let anyData = 0;
	for (let i = 0; i < AVAILABILITY_DAYS; i++) {
		const day = shiftDate(today, -i);
		if (index.has("sleep_duration", day) && index.has("resting_hr", day)) basics++;
		if (index.has("hrv", day)) hrvDays++;
		if (index.has("training_readiness", day)) garmin = true;
		if (ANY_DATA_KEYS.some((key) => index.has(key, day))) anyData++;
	}
	if (basics >= TODAY_MIN_DAYS) return hrvDays >= TODAY_MIN_DAYS ? "full" : "reduced";
	if (garmin) return "garmin";
	return anyData >= JUDGE_DAYS ? "none" : "unknown";
}
