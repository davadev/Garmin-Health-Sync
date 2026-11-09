// Why it matters: an interpretation tells the user why a value is off and what to do. Each rule must fire on
// exactly the data that justifies it and stay quiet otherwise; a wrong "why" is worse than no text.
import { describe, expect, it } from "vitest";
import { App } from "../testUtils/mocks/obsidian";
import { seedHistory } from "../testUtils/fakeHistory";
import { DayIndex } from "../src/panel/index";
import { Signals } from "../src/panel/insights/signals";
import { INSIGHTS, MAX_INSIGHTS, insightText, type Insight } from "../src/panel/insights/registry";
import { breathingInsights, hrvInsights, restingHrInsights, spo2Insights } from "../src/panel/insights/recovery";
import { sleepInsights, stagesInsights } from "../src/panel/insights/sleep";
import { batteryInsights, stressInsights } from "../src/panel/insights/energy";
import { bodyInsights, intensityInsights, stepsInsights, vo2Insights } from "../src/panel/insights/activity";
import { loadInsights, sessionsInsights, weeklyInsights } from "../src/panel/insights/training";
import { en } from "../src/i18n/en";
import { de } from "../src/i18n/de";

const settings = { dailyNotePath: "", dailyNoteFormat: "YYYY-MM-DD" };
const END = "2026-10-22"; // a Thursday
type Fm = Record<string, unknown>;
const dur = (m: number): string => `${Math.floor(m / 60)}h ${m % 60}min`;

/** `fm(ago)` is the note `ago` days before END (0 = the shown day); null = no note. */
async function signals(fm: (ago: number) => Fm | null, days = 45, birthYear: number | null = null): Promise<Signals> {
	const app = new App();
	await seedHistory(app, { end: END, days, frontmatter: fm });
	return new Signals(new DayIndex(app as never, () => settings), END, birthYear);
}
const ids = (list: Insight[]): string[] => list.map((i) => i.id);
/** Alternating two values: mean (a+b)/2 and standard deviation |a-b|/2 over the 30 days before. */
const alt = (ago: number, a: number, b: number): number => (ago % 2 === 0 ? a : b);
/** Running minutes a day: `recent` in the last 7 days, `earlier` before (load ratio = recent*28/(recent*7+earlier*21)). */
const run = (ago: number, recent: number, earlier: number): Fm => ({ running: `${ago < 7 ? recent : earlier}min` });

describe("every registered interpretation", () => {
	it("is either a point to watch or something good, and belongs to a card", () => {
		for (const meta of Object.values(INSIGHTS)) {
			expect(["watch", "good"]).toContain(meta.kind);
			expect(meta.card).toBeTruthy();
		}
	});

	it("fills the values into the text of the plugin language", () => {
		expect(insightText({ id: "hrv_low_load", params: { pct: "70" } }, "en")).toBe(en.insight_hrv_low_load.replace("{pct}", "70"));
		expect(insightText({ id: "hrv_low_load", params: { pct: "70" } }, "de")).toBe(de.insight_hrv_low_load.replace("{pct}", "70"));
		expect(insightText({ id: "unexplained" }, "en")).toBe(en.insight_unexplained);
		expect(insightText({ id: "sleep_short_late_bed", params: { late: "1 h", bed: "23:00", gain: "30 min" } }, "en")).not.toMatch(/\{/);
	});
});

describe("HRV", () => {
	/** HRV 58/62 before the shown day (mean 60, sd 2) and `today`. */
	const hrv = (today: number, extra: (ago: number) => Fm = () => ({})) => signals((ago) => ({ hrv: ago === 0 ? today : alt(ago, 62, 58), ...extra(ago) }));

	it("has nothing to say without a reading or a range", async () => {
		expect(hrvInsights(await signals((ago) => (ago === 0 ? { hrv: 50 } : null), 4))).toEqual([]);
		expect(hrvInsights(await signals((ago) => (ago === 0 ? null : { hrv: 60 })))).toEqual([]);
	});

	it("confirms a value in the usual range", async () => {
		expect(ids(hrvInsights(await hrv(61)))).toEqual(["hrv_in_range"]);
	});

	it("blames a spike in training load, with its size", async () => {
		const out = hrvInsights(await hrv(54, (ago) => run(ago, 90, 30)));
		expect(out).toEqual([{ id: "hrv_low_load", params: { pct: "100" } }]); // ratio 2.0
	});

	it("blames a sleep shortfall of two hours or more", async () => {
		const out = hrvInsights(await hrv(54, () => ({ sleep_duration: "5h 0min" })));
		expect(out).toEqual([{ id: "hrv_low_sleep", params: { debt: "14 h", need: "7" } }]);
		expect(ids(hrvInsights(await hrv(54, () => ({ sleep_duration: "6h 50min" }))))).toEqual(["unexplained"]);
	});

	it("blames a stress level above the usual", async () => {
		expect(ids(hrvInsights(await hrv(54, (ago) => ({ stress: ago === 0 ? 55 : alt(ago, 30, 34) }))))).toEqual(["hrv_low_stress"]);
	});

	it("flags low HRV together with a raised resting heart rate", async () => {
		expect(ids(hrvInsights(await hrv(54, (ago) => ({ resting_hr: ago === 0 ? 60 : alt(ago, 50, 54) }))))).toEqual(["hrv_low_illness"]);
	});

	it("says nothing else explains it when no rule finds a cause", async () => {
		expect(ids(hrvInsights(await hrv(54)))).toEqual(["unexplained"]);
	});

	it("flags low HRV together with faster breathing as a possible illness", async () => {
		expect(ids(hrvInsights(await hrv(54, (ago) => ({ respiration_rate: ago === 0 ? 17 : alt(ago, 13, 15.4) }))))).toEqual(["hrv_low_illness"]);
	});

	it("warns when HRV stays under the usual range for several nights with no explanation", async () => {
		const low = (nights: number) => signals((ago) => ({ hrv: ago < nights ? 54 : alt(ago, 62, 58) }));
		expect(hrvInsights(await low(2))).toEqual([{ id: "hrv_low_streak", params: { n: "2" } }]);
		expect(hrvInsights(await low(4))).toEqual([{ id: "hrv_low_streak", params: { n: "4" } }]);
		expect(ids(hrvInsights(await low(1)))).toEqual(["unexplained"]);
		expect(hrvInsights(await signals((ago) => ({ hrv: ago < 9 ? 20 - ago : alt(ago, 62, 58) })))).toEqual([{ id: "hrv_low_streak", params: { n: "7" } }]); // counted back a week at most
		expect(ids(hrvInsights(await signals((ago) => ({ hrv: ago === 0 ? 54 : alt(ago, 62, 58) }), 6)))).toEqual(["unexplained"]); // yesterday has no range of its own yet
	});

	it("blames the known cause and not the streak when one exists", async () => {
		const out = hrvInsights(await signals((ago) => ({ hrv: ago < 3 ? 54 : alt(ago, 62, 58), sleep_duration: "5h 0min" })));
		expect(ids(out)).toEqual(["hrv_low_sleep"]);
	});

	it("shows at most three reasons", async () => {
		const out = hrvInsights(await hrv(54, (ago) => ({ ...run(ago, 90, 30), sleep_duration: "5h 0min", stress: ago === 0 ? 55 : alt(ago, 30, 34), resting_hr: ago === 0 ? 60 : alt(ago, 50, 54) })));
		expect(ids(out)).toEqual(["hrv_low_load", "hrv_low_sleep", "hrv_low_stress"]);
		expect(out).toHaveLength(MAX_INSIGHTS);
	});

	it("explains a high value only when the load eased", async () => {
		expect(hrvInsights(await hrv(66, (ago) => run(ago, 10, 30)))).toEqual([{ id: "hrv_high_light_load", params: { pct: "60" } }]);
		expect(ids(hrvInsights(await hrv(66)))).toEqual(["hrv_high_rested"]);
		expect(ids(hrvInsights(await hrv(66, (ago) => run(ago, 90, 30))))).toEqual(["hrv_high_rested"]); // the load did not ease
	});
});

describe("resting heart rate", () => {
	const rhr = (today: number, extra: (ago: number) => Fm = () => ({})) => signals((ago) => ({ resting_hr: ago === 0 ? today : alt(ago, 50, 54), ...extra(ago) }));

	it("has nothing without a reading", async () => {
		expect(restingHrInsights(await signals((ago) => (ago === 0 ? null : { resting_hr: 52 })))).toEqual([]);
	});

	it("confirms a value in range", async () => {
		expect(ids(restingHrInsights(await rhr(53)))).toEqual(["rhr_in_range"]);
	});

	it("credits a lower value to fitness and recovery", async () => {
		expect(ids(restingHrInsights(await rhr(45)))).toEqual(["rhr_low_fitness"]);
	});

	it("blames training load and sleep debt when they apply", async () => {
		expect(restingHrInsights(await rhr(60, (ago) => run(ago, 90, 30)))).toEqual([{ id: "rhr_high_load", params: { pct: "100" } }]);
		expect(restingHrInsights(await rhr(60, () => ({ sleep_duration: "5h 0min" })))).toEqual([{ id: "rhr_high_sleep", params: { debt: "14 h" } }]);
	});

	it("flags a high value with low HRV or fast breathing as a possible illness", async () => {
		expect(ids(restingHrInsights(await rhr(60, (ago) => ({ hrv: ago === 0 ? 50 : alt(ago, 62, 58) }))))).toEqual(["rhr_high_illness"]);
		expect(ids(restingHrInsights(await rhr(60, (ago) => ({ respiration_rate: ago === 0 ? 17 : alt(ago, 13, 15.4) }))))).toEqual(["rhr_high_illness"]);
	});

	it("says nothing else explains it otherwise", async () => {
		expect(ids(restingHrInsights(await rhr(60)))).toEqual(["unexplained"]);
	});
});

describe("SpO2", () => {
	const spo2 = (today: number, extra: (ago: number) => Fm = () => ({}), nights: (ago: number) => number | null = (ago) => alt(ago, 96, 97)) =>
		signals((ago) => ({ spo2: ago === 0 ? today : nights(ago), ...extra(ago) }));

	it("has nothing without a reading", async () => {
		expect(spo2Insights(await signals((ago) => (ago === 0 ? null : { spo2: 96 })))).toEqual([]);
	});

	it("confirms a healthy value", async () => {
		expect(ids(spo2Insights(await spo2(96)))).toEqual(["spo2_ok"]);
		expect(ids(spo2Insights(await spo2(94.5, () => ({}), (ago) => alt(ago, 93, 96))))).toEqual(["spo2_usual"]); // not low for this sleeper, but below 95
	});

	it("calls a single low night a matter of sensor fit and trend", async () => {
		expect(ids(spo2Insights(await spo2(93)))).toEqual(["spo2_low_single"]);
		expect(ids(spo2Insights(await spo2(96.5, () => ({}), (ago) => alt(ago, 99, 99.5))))).toEqual(["spo2_low_single"]); // far below its own mean
	});

	it("links a low night to a raised breathing rate", async () => {
		expect(ids(spo2Insights(await spo2(93, (ago) => ({ respiration_rate: ago === 0 ? 17 : alt(ago, 13, 15.4) }))))).toEqual(["spo2_low_with_breathing"]);
	});

	it("points to a doctor after at least 3 low nights in the last 7", async () => {
		const out = spo2Insights(await spo2(91, () => ({}), (ago) => (ago <= 2 ? 91 : alt(ago, 96, 97))));
		expect(out[0]).toEqual({ id: "spo2_low_repeated", params: { n: "3" } });
		const two = spo2Insights(await spo2(91, () => ({}), (ago) => (ago <= 1 ? 91 : alt(ago, 96, 97))));
		expect(ids(two)).toEqual(["spo2_low_single"]);
	});
});

describe("breathing", () => {
	const breathing = (today: number, extra: (ago: number) => Fm = () => ({}), a = 13, b = 15.4) => signals((ago) => ({ respiration_rate: ago === 0 ? today : alt(ago, a, b), ...extra(ago) }));

	it("has nothing without a reading", async () => {
		expect(breathingInsights(await signals((ago) => (ago === 0 ? null : { respiration_rate: 14 })))).toEqual([]);
	});

	it("confirms a value in range, and says a low one is no cause for concern", async () => {
		expect(ids(breathingInsights(await breathing(14.5)))).toEqual(["breathing_ok"]);
		expect(ids(breathingInsights(await breathing(11)))).toEqual(["breathing_low"]);
	});

	it("pairs a raised rate with a raised resting heart rate as an early illness sign", async () => {
		expect(ids(breathingInsights(await breathing(16, (ago) => ({ resting_hr: ago === 0 ? 60 : alt(ago, 50, 54) }))))).toEqual(["breathing_up_illness"]);
	});

	it("calls a raised rate on its own a weak signal, also when only the 1.5 rise says so", async () => {
		expect(ids(breathingInsights(await breathing(16)))).toEqual(["breathing_up_alone"]);
		expect(ids(breathingInsights(await breathing(15.8, () => ({}), 12.6, 15.8)))).toEqual(["breathing_up_alone"]);
	});
});

describe("sleep", () => {
	/** Nights of `asleep(ago)` minutes, bedtime `bed(ago)` and wake-up `end(ago)` ("HH:MM", or null for no time). */
	const nights = (asleep: (ago: number) => number | null, bed: (ago: number) => string | null = () => null, end: (ago: number) => string | null = () => null) =>
		signals((ago) => ({ ...(asleep(ago) === null ? {} : { sleep_duration: dur(asleep(ago)!) }), ...(bed(ago) ? { sleep_start: bed(ago) } : {}), ...(end(ago) ? { sleep_end: end(ago) } : {}) }), 10);

	it("has nothing without last night's sleep", async () => {
		expect(sleepInsights(await nights((ago) => (ago === 0 ? null : 450)))).toEqual([]);
	});

	it("blames a late bedtime for a short night, with how late and how much it would have given", async () => {
		const out = sleepInsights(await nights((ago) => (ago === 0 ? 330 : 450), (ago) => (ago === 0 ? "00:30" : "23:00"), () => "06:30"));
		expect(out).toEqual([{ id: "sleep_short_late_bed", params: { late: "1 h 17 min", bed: "23:13", gain: "1 h 17 min" } }]);
	});

	it("blames an early wake-up for a short night", async () => {
		const out = sleepInsights(await nights((ago) => (ago === 0 ? 330 : 450), () => "23:00", (ago) => (ago === 0 ? "04:30" : "06:30")));
		expect(out).toEqual([{ id: "sleep_short_early_wake", params: { early: "1 h 43 min", wake: "06:13" } }]);
	});

	it("says what the average night lacks and how large the debt is", async () => {
		const out = sleepInsights(await nights(() => 380));
		expect(out).toEqual([
			{ id: "sleep_short_average", params: { avg: "6 h 20 min", gap: "40 min", need: "7" } },
			{ id: "sleep_debt_high", params: { debt: "4 h 40 min" } },
		]);
	});

	it("warns about irregular times", async () => {
		const out = sleepInsights(await nights(() => 450, (ago) => (ago % 2 ? "22:00" : "00:30"), (ago) => (ago % 2 ? "05:30" : "08:00")));
		expect(ids(out)).toEqual(["sleep_irregular"]);
		expect(Number(out[0]!.params!["sd"])).toBeGreaterThanOrEqual(60);
	});

	it("praises regular times and enough sleep, and enough sleep alone", async () => {
		expect(sleepInsights(await nights(() => 450, () => "23:00", () => "06:30"))).toEqual([{ id: "sleep_regular_good", params: { sd: "0" } }]);
		expect(sleepInsights(await nights(() => 450))).toEqual([{ id: "sleep_enough_good", params: { sleep: "7 h 30 min" } }]);
	});

	it("averages only the nights that have a duration, and needs five of them", async () => {
		const out = sleepInsights(await nights((ago) => (ago === 0 ? 380 : ago <= 4 ? 380 : null)));
		expect(ids(out)).toEqual(["sleep_short_average", "sleep_debt_high"]); // 5 nights of 6 h 20 min
		expect(ids(sleepInsights(await nights((ago) => (ago <= 3 ? 380 : null))))).toEqual(["sleep_short_plain"]); // only 4 nights: no average, but the night itself is short
	});

	it("does not praise a night that reached the need after a week with a sizeable debt", async () => {
		expect(sleepInsights(await nights((ago) => (ago === 0 ? 450 : 400)))).toEqual([]);
	});

	it("praises a night that reached the need while there are too few nights to count a debt", async () => {
		expect(ids(sleepInsights(await nights((ago) => (ago <= 2 ? 450 : null))))).toEqual(["sleep_enough_good"]);
	});

	it("says nothing for a night slightly short of the need without a reason", async () => {
		expect(sleepInsights(await nights(() => 410))).toEqual([]);
	});

	it("does not call a short night late-to-bed when the times are close to the usual", async () => {
		const out = sleepInsights(await nights((ago) => (ago === 0 ? 330 : 450), () => "23:00", () => "06:30"));
		expect(out).toEqual([{ id: "sleep_short_plain", params: { gap: "1 h 30 min", need: "7" } }]);
	});

	it("keeps quiet about timing with fewer than three nights with times", async () => {
		const out = sleepInsights(await nights((ago) => (ago === 0 ? 330 : 450), (ago) => (ago < 2 ? "00:30" : null), (ago) => (ago < 2 ? "06:30" : null)));
		expect(ids(out)).toEqual(["sleep_short_plain"]);
	});
});

describe("sleep stages", () => {
	/** Stages usually 60/90/200/20 minutes; `today` overrides them for the shown day. */
	const stages = (today: Partial<Record<"deep" | "rem" | "light" | "awake", number>> = {}, extra: (ago: number) => Fm = () => ({})) =>
		signals((ago) => {
			const v = { deep: 60, rem: 90, light: 200, awake: 20, ...(ago === 0 ? today : {}) };
			return { sleep_deep: dur(v.deep), sleep_rem: dur(v.rem), sleep_light: dur(v.light), sleep_awake: dur(v.awake), ...extra(ago) };
		});

	it("has nothing without all four stages", async () => {
		expect(stagesInsights(await signals((ago) => (ago === 0 ? { sleep_deep: "1h 0min" } : { sleep_deep: "1h 0min", sleep_rem: "1h 0min", sleep_light: "3h 0min", sleep_awake: "0h 20min" })))).toEqual([]);
	});

	it("confirms a typical night", async () => {
		expect(ids(stagesInsights(await stages()))).toEqual(["stages_typical"]);
	});

	it("blames a quiet day for little deep sleep", async () => {
		expect(ids(stagesInsights(await stages({ deep: 40 }, (ago) => ({ steps: ago === 1 ? 4000 : alt(ago, 10000, 10200) }))))).toEqual(["deep_low_inactive"]);
	});

	it("blames interrupted sleep for little deep sleep", async () => {
		expect(ids(stagesInsights(await stages({ deep: 40, awake: 45 }, (ago) => ({ steps: alt(ago, 10000, 10200) }))))).toContain("deep_low_fragmented");
	});

	it("explains the timing of deep sleep when nothing in the data does", async () => {
		expect(ids(stagesInsights(await stages({ deep: 40 })))).toEqual(["deep_low_timing"]);
	});

	it("blames an early alarm for little REM, with how early", async () => {
		const s = await signals((ago) => ({ sleep_deep: dur(60), sleep_rem: dur(ago === 0 ? 60 : 90), sleep_light: dur(200), sleep_awake: dur(20), sleep_duration: dur(450), sleep_start: "23:00", sleep_end: ago === 0 ? "04:30" : "06:30" }), 45);
		expect(stagesInsights(s)).toEqual([{ id: "rem_low_early_wake", params: { early: "1 h 43 min", wake: "06:13" } }]);
	});

	it("blames a short night for little REM, with the gap", async () => {
		const s = await signals((ago) => ({ sleep_deep: dur(60), sleep_rem: dur(ago === 0 ? 60 : 90), sleep_light: dur(200), sleep_awake: dur(20), sleep_duration: dur(ago === 0 ? 300 : 450) }), 45);
		expect(stagesInsights(s)).toEqual([{ id: "rem_low_short_night", params: { gap: "2 h" } }]);
	});

	it("says nothing else explains little REM after a night of normal length", async () => {
		const s = await signals((ago) => ({ sleep_deep: dur(60), sleep_rem: dur(ago === 0 ? 60 : 90), sleep_light: dur(200), sleep_awake: dur(20), sleep_duration: dur(450) }), 45);
		expect(ids(stagesInsights(s))).toEqual(["unexplained"]);
	});

	it("explains much awake time by stress, then by breathing, otherwise says nothing explains it", async () => {
		expect(ids(stagesInsights(await stages({ awake: 45 }, (ago) => ({ stress: ago === 0 ? 55 : alt(ago, 30, 34) }))))).toEqual(["awake_high_stress"]);
		expect(ids(stagesInsights(await stages({ awake: 45 }, (ago) => ({ respiration_rate: ago === 0 ? 17 : alt(ago, 13, 15.4) }))))).toEqual(["awake_high_breathing"]);
		expect(ids(stagesInsights(await stages({ awake: 45 }, (ago) => ({ spo2: ago === 0 ? 90 : alt(ago, 96, 97) }))))).toEqual(["awake_high_breathing"]);
		expect(ids(stagesInsights(await stages({ awake: 45 })))).toEqual(["unexplained"]);
	});

	it("links more deep sleep to an active day", async () => {
		expect(ids(stagesInsights(await stages({ deep: 80 }, (ago) => ({ steps: ago === 1 ? 14000 : alt(ago, 10000, 10200) }))))).toEqual(["stages_deep_active"]);
	});

	it("does not link more deep sleep to activity without yesterday's steps", async () => {
		expect(ids(stagesInsights(await stages({ deep: 80 })))).toEqual(["stages_typical"]);
	});

	it("does not call a night typical when the baselines are too short", async () => {
		expect(stagesInsights(await signals((ago) => (ago <= 3 ? { sleep_deep: dur(60), sleep_rem: dur(90), sleep_light: dur(200), sleep_awake: dur(20) } : null), 4))).toEqual([]);
	});
});

describe("body battery", () => {
	const battery = (today: Fm, extra: (ago: number) => Fm = () => ({})) => signals((ago) => ({ ...(ago === 0 ? today : { body_battery_max: alt(ago, 80, 84), body_battery: 55 }), ...extra(ago) }));

	it("has nothing without a peak", async () => {
		expect(batteryInsights(await battery({ hrv: 1 }))).toEqual([]);
	});

	it("blames a short night, yesterday's stress and a high load for a low peak", async () => {
		expect(batteryInsights(await battery({ body_battery_max: 60, sleep_duration: "5h 0min" }))).toEqual([{ id: "battery_low_sleep", params: { sleep: "5 h" } }]);
		expect(ids(batteryInsights(await battery({ body_battery_max: 60 }, (ago) => ({ stress: ago === 1 ? 70 : alt(ago, 30, 34) }))))).toEqual(["battery_low_stress"]);
		expect(ids(batteryInsights(await battery({ body_battery_max: 60 }, (ago) => run(ago, 90, 30))))).toEqual(["battery_low_load"]);
	});

	it("says nothing else explains a low peak", async () => {
		expect(ids(batteryInsights(await battery({ body_battery_max: 60 })))).toEqual(["unexplained"]);
	});

	it("keeps quiet for a normal peak, and praises a good recharge after enough sleep", async () => {
		expect(ids(batteryInsights(await battery({ body_battery_max: 82 })))).toEqual(["battery_usual"]);
		expect(batteryInsights(await battery({ body_battery_max: 82, body_battery: 70, sleep_duration: "7h 30min" }))).toEqual([{ id: "battery_recharge_good", params: { sleep: "7 h 30 min" } }]);
		expect(ids(batteryInsights(await battery({ body_battery_max: 82, body_battery: 70, sleep_duration: "5h 0min" })))).toEqual(["battery_usual"]);
		expect(ids(batteryInsights(await battery({ body_battery_max: 82, body_battery: 70 })))).toEqual(["battery_usual"]);
	});
});

describe("stress", () => {
	const stress = (today: number | null, week = 35) => signals((ago) => (ago === 0 ? (today === null ? null : { stress: today }) : { stress: week }), 10);

	it("has nothing without a level", async () => {
		expect(stressInsights(await stress(null))).toEqual([]);
	});

	it("links a high level to a short night and to the week's average", async () => {
		const out = stressInsights(await signals((ago) => ({ stress: ago === 0 ? 60 : 35, sleep_duration: ago === 0 ? "5h 0min" : "7h 30min" }), 10));
		expect(out).toEqual([
			{ id: "stress_high_sleep", params: { sleep: "5 h" } },
			{ id: "stress_high_week", params: { week: "35" } },
		]);
	});

	it("points out a day with more stressed than recovering minutes, with both amounts", async () => {
		const stressed = (hi: number, rest: number) => signals((ago) => ({ stress: ago === 0 ? 40 : 35, ...(ago === 0 ? { stress_high: hi, recovery_high: rest } : {}) }), 10);
		expect(stressInsights(await stressed(240, 130))).toEqual([{ id: "stress_more_stressed", params: { stressed: "4 h", recovering: "2 h 10 min" } }]);
		expect(ids(stressInsights(await stressed(130, 240)))).toEqual(["stress_usual"]);
		expect(ids(stressInsights(await stressed(130, 130)))).toEqual(["stress_usual"]);
	});

	it("says a level in between is in line with the week, that a high one is in line with a high week, and calm for a low one", async () => {
		expect(stressInsights(await stress(40))).toEqual([{ id: "stress_usual", params: { level: "40", week: "35" } }]);
		expect(stressInsights(await stress(60, 58))).toEqual([{ id: "stress_high_usual", params: { level: "60", week: "58" } }]);
		expect(ids(stressInsights(await stress(20)))).toEqual(["stress_calm"]);
	});
});

describe("steps and intensity minutes", () => {
	it("praises steps above the zone", async () => {
		const s = await signals((ago) => ({ steps: ago === 0 ? 12000 : 10000 }), 10);
		expect(ids(stepsInsights(s))).toEqual(["steps_zone_good"]);
	});

	it("points out a streak of quiet days when steps are below the zone", async () => {
		const s = await signals((ago) => ({ steps: ago === 0 ? 7000 : ago <= 5 ? 6000 : 10000 }), 45);
		expect(stepsInsights(s)).toEqual([{ id: "steps_below_streak", params: { n: "5" } }]);
	});

	it("counts a day without steps as not quiet", async () => {
		const s = await signals((ago) => (ago === 0 ? { steps: 7000 } : ago <= 5 ? (ago <= 3 ? { steps: 6000 } : { hrv: 1 }) : { steps: 10000 }), 45);
		expect(stepsInsights(s)).toEqual([{ id: "steps_below_streak", params: { n: "3" } }]);
		const two = await signals((ago) => (ago === 0 ? { steps: 7000 } : ago <= 5 ? (ago <= 2 ? { steps: 6000 } : { hrv: 1 }) : { steps: 10000 }), 45);
		expect(stepsInsights(two)).toEqual([]);
	});

	it("says nothing for a below-zone day after normal days or without a range", async () => {
		expect(stepsInsights(await signals((ago) => ({ steps: ago === 0 ? 8000 : 10000 }), 45))).toEqual([]);
		expect(stepsInsights(await signals((ago) => ({ steps: ago === 0 ? 8000 : 10000 }), 3))).toEqual([]);
		expect(stepsInsights(await signals((ago) => (ago === 0 ? null : { steps: 10000 }), 10))).toEqual([]);
	});

	it("says how much a day is needed to reach the intensity goal, and praises reaching it", async () => {
		const behind = await signals((ago) => ({ intensity_min: ago < 4 ? 10 : 0 }), 8);
		expect(intensityInsights(behind)).toEqual([{ id: "intensity_behind", params: { perDay: "37", days: "3" } }]);
		const done = await signals((ago) => ({ intensity_min: ago < 4 ? 40 : 0 }), 8);
		expect(ids(intensityInsights(done))).toEqual(["intensity_goal_good"]);
	});

	it("has nothing on the last day of the week or without data", async () => {
		const s = await signals((ago) => ({ intensity_min: ago < 7 ? 10 : 0 }), 8);
		expect(intensityInsights(new Signals(s.index, "2026-10-25", null))).toEqual([]);
		expect(intensityInsights(await signals(() => ({ hrv: 1 }), 8))).toEqual([]);
	});
});

describe("cardio fitness and body", () => {
	/** One VO2 value on each Thursday: week w ago has `value(w)`; `minutes(ago)` of running each day. */
	const vo2 = (value: (w: number) => number, minutes: (ago: number) => number = () => 30) =>
		signals((ago) => ({ running: `${minutes(ago)}min`, ...(ago % 7 === 0 && ago / 7 < 12 ? { vo2_max: value(ago / 7) } : {}) }), 90);

	it("welcomes a rising trend", async () => {
		expect(ids(vo2Insights(await vo2((w) => 50 - 0.5 * w)))).toEqual(["vo2_up_good"]);
	});

	it("blames fewer training minutes for a falling trend, with how much fewer", async () => {
		expect(vo2Insights(await vo2((w) => 44 + 0.5 * w, (ago) => (ago < 28 ? 10 : 60)))).toEqual([{ id: "vo2_down_volume", params: { pct: "83" } }]);
	});

	it("looks at other causes when the volume did not fall", async () => {
		expect(ids(vo2Insights(await vo2((w) => 44 + 0.5 * w)))).toEqual(["vo2_down_other"]);
		expect(ids(vo2Insights(await vo2((w) => 44 + 0.5 * w, (ago) => (ago < 28 ? 55 : 60))))).toEqual(["vo2_down_other"]);
		expect(ids(vo2Insights(await signals((ago) => ({ running: "1min", ...(ago % 7 === 0 && ago / 7 < 12 ? { vo2_max: 44 + 0.5 * (ago / 7) } : {}) }), 90)))).toEqual(["vo2_down_other"]);
	});

	it("says a steady trend is held by the current training, and has nothing without a reading or without training", async () => {
		expect(vo2Insights(await vo2(() => 50))).toEqual([{ id: "vo2_steady", params: { min: "210" } }]); // 30 minutes a day
		expect(vo2Insights(await vo2(() => 50, () => 0))).toEqual([]);
		expect(vo2Insights(await signals(() => ({ hrv: 1 }), 90))).toEqual([]);
	});

	it("explains a fast weight change by water, meals and the weekday, and confirms a stable one", async () => {
		expect(ids(bodyInsights(await signals((ago) => ({ weight_kg: 80 - 0.2 * ago }), 40)))).toEqual(["body_fast"]);
		expect(ids(bodyInsights(await signals(() => ({ weight_kg: 80 }), 40)))).toEqual(["body_stable"]);
	});

	it("has nothing without enough readings", async () => {
		expect(bodyInsights(await signals(() => ({ hrv: 1 }), 40))).toEqual([]);
		expect(bodyInsights(await signals((ago) => (ago === 0 ? { weight_kg: 80 } : { hrv: 1 }), 40))).toEqual([]);
		expect(bodyInsights(await signals((ago) => (ago === 0 || ago === 5 ? { weight_kg: 80 } : { hrv: 1 }), 40))).toEqual([]);
	});
});

describe("load balance and weekly load", () => {
	it.each([
		[60, 30, "load_overreach", "60"],
		[50, 30, "load_strain", "43"],
		[30, 30, "load_build", undefined],
		[10, 30, "load_detrain", "60"],
	])("recent %s against %s a day: %s", async (recent, earlier, id, pct) => {
		const out = loadInsights(await signals((ago) => run(ago, recent, earlier), 35));
		expect(out).toEqual([pct === undefined ? { id } : { id, params: { pct } }]);
	});

	it("calls the maintain zone a steady week, and has nothing without a ratio", async () => {
		expect(loadInsights(await signals((ago) => run(ago, 26, 30), 35))).toEqual([{ id: "load_maintain" }]);
		expect(loadInsights(await signals(() => ({ hrv: 1 }), 35))).toEqual([]);
	});

	it("warns when the week is above the cap and is happy when it is close to it", async () => {
		const week = (perDay: (ago: number) => number) => signals((ago) => ({ running: `${perDay(ago)}min` }), 35);
		expect(weeklyInsights(await week((ago) => (ago < 4 ? 90 : 30)))).toEqual([{ id: "weekly_over_cap", params: { pct: "71" } }]);
		expect(ids(weeklyInsights(await week((ago) => (ago < 4 ? 55 : 30))))).toEqual(["weekly_on_track"]);
		expect(weeklyInsights(await week((ago) => (ago < 4 ? 20 : 30)))).toEqual([]);
	});

	it("has nothing without an average to compare with", async () => {
		expect(weeklyInsights(await signals((ago) => ({ running: `${ago < 4 ? 40 : 0}min` }), 35))).toEqual([]);
		expect(weeklyInsights(await signals((ago) => ({ running: "30min", hrv: ago }), 3))).toEqual([]);
	});
});

describe("sessions", () => {
	const born = 1986; // maximum heart rate 180
	const week = (hr: (ago: number) => number | null) => signals((ago) => (hr(ago) === null ? { hrv: 1 } : { running: `40min · Ø${hr(ago)} bpm` }), 10, born);

	it("warns when this week's sessions were all hard", async () => {
		expect(sessionsInsights(await week(() => 160))).toEqual([{ id: "sessions_all_hard", params: { n: "7" } }]);
	});

	it("is happy with mostly easy sessions and some hard work", async () => {
		expect(sessionsInsights(await week((ago) => (ago === 0 ? 165 : ago < 6 ? 120 : null)))).toEqual([{ id: "sessions_mostly_easy", params: { pct: "83" } }]);
	});

	it("needs a birth year, three sessions with a heart rate and a clear pattern", async () => {
		expect(sessionsInsights(await signals((ago) => ({ running: "40min · Ø160 bpm", hrv: ago }), 10, null))).toEqual([]);
		expect(sessionsInsights(await week((ago) => (ago < 2 ? 160 : null)))).toEqual([]);
		expect(sessionsInsights(await week((ago) => (ago < 6 ? 135 : null)))).toEqual([]); // all zone 3: neither hard nor easy
	});

	it("leaves out recovery sessions and sessions without a heart rate", async () => {
		const s = await signals((ago) => ({ breathwork: "10min · Ø60 bpm", yoga: "30min", ...(ago < 2 ? { running: "30min · Ø160 bpm" } : {}) }), 10, born);
		expect(sessionsInsights(s)).toEqual([]);
	});
});

describe("the night after a hard session", () => {
	/** Every day an easy 80 minute run, yesterday's in zone 4 (170 bpm for someone born in 1986) or easy. */
	const days = (hr: number) => (ago: number): Fm => ({ running: `80min · Ø${ago === 1 ? hr : 100} bpm` });

	it("explains a low HRV first, ahead of the other reasons", async () => {
		const s = await signals((ago) => ({ hrv: ago === 0 ? 54 : alt(ago, 62, 58), ...days(170)(ago) }), 45, 1986);
		expect(ids(hrvInsights(s))).toEqual(["hrv_low_hard_session"]);
	});

	it("explains a raised resting heart rate first", async () => {
		const s = await signals((ago) => ({ resting_hr: ago === 0 ? 60 : alt(ago, 50, 54), ...days(170)(ago) }), 45, 1986);
		expect(ids(restingHrInsights(s))).toEqual(["rhr_high_hard_session"]);
	});

	it("says nothing about a hard session after an easy one", async () => {
		const s = await signals((ago) => ({ hrv: ago === 0 ? 54 : alt(ago, 62, 58), resting_hr: ago === 0 ? 60 : alt(ago, 50, 54), ...days(100)(ago) }), 45, 1986);
		expect(ids(hrvInsights(s))).not.toContain("hrv_low_hard_session");
		expect(ids(restingHrInsights(s))).not.toContain("rhr_high_hard_session");
	});
});
