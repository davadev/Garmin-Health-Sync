// Why it matters: the personal best marker must show what is reasonably possible, so it is built from days on which
// every metric was good together (not one great value on a bad day), searches only the days a metric exists on (a new
// watch), and says nothing from too little data. The rank among all days gives every card something to say from the
// years of history.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../testUtils/mocks/obsidian";
import { seedHistory } from "../testUtils/fakeHistory";
import { HistoryStore } from "../src/history/store";
import { shiftDate } from "../src/dates";
import { DayIndex } from "../src/panel/index";
import { historyRank, historyView, personalBest } from "../src/panel/best-days";
import { Signals } from "../src/panel/insights/signals";
import { withHistory } from "../src/panel/insights/history";
import { insightText } from "../src/panel/insights/registry";
import { bestFact, historyFacts } from "../src/panel/longview";
import { computeRange, renderRange, HRV_CARD, RESTING_HR_CARD, SPO2_CARD } from "../src/panel/cards/range-card";
import { computeStress, renderStress } from "../src/panel/cards/stress-card";
import { computeSteps, renderSteps } from "../src/panel/cards/steps-card";
import { computeBattery, renderBattery } from "../src/panel/cards/battery-card";
import { computeFloors, renderFloors } from "../src/panel/cards/floors-card";
import { serializeMonth } from "../src/history/format";

const END = "2026-10-22";
const settings = { dailyNotePath: "", dailyNoteFormat: "YYYY-MM-DD" };

/** Every tenth day all metrics are good; every tenth day plus five a great value (HRV) comes with bad stress; the rest is middling. */
function ordinary(ago: number): Record<string, unknown> {
	if (ago % 10 === 0) return { hrv: 100, resting_hr: 40, stress: 10, sleep_score: 100, body_battery_max: 100, spo2: 98, steps: 12000 };
	if (ago % 10 === 5) return { hrv: 200, resting_hr: 40, stress: 90, sleep_score: 100, body_battery_max: 100, spo2: 98, steps: 12000 };
	return { hrv: 50, resting_hr: 60, stress: 40, sleep_score: 50, body_battery_max: 70, spo2: 95, steps: 8000 };
}

async function indexOf(days: number, frontmatter: (ago: number) => Record<string, unknown> | null): Promise<DayIndex> {
	const app = new App();
	await seedHistory(app, { end: END, days, frontmatter });
	return new DayIndex(app as never, () => settings);
}

describe("personal best", () => {
	it("averages the metric on the days when all the metrics were good together, in the better direction", async () => {
		const index = await indexOf(200, ordinary);
		expect(personalBest(index, END, "hrv")).toBe(100);
		expect(personalBest(index, END, "resting_hr")).toBe(40);
		expect(personalBest(index, END, "stress")).toBe(10);
		expect(personalBest(index, END, "steps")).toBe(12000);
	});

	it("is not pulled up by a great value on a day that was bad elsewhere", async () => {
		// the days with an HRV of 200 have the worst stress of all: their weakest metric sinks them, so 200 is not what the best days average
		const index = await indexOf(200, ordinary);
		expect(personalBest(index, END, "hrv")).toBeLessThan(150);
	});

	it("gives nothing for a metric that is not part of it", async () => {
		const index = await indexOf(200, (ago) => ({ ...ordinary(ago), respiration_rate: 14 }));
		expect(personalBest(index, END, "respiration_rate")).toBeNull();
	});

	it("searches a metric only on the days it exists on: HRV of a new watch from its weeks, stress from all the years", async () => {
		// HRV only on the last 21 days; stress has years of days
		const index = await indexOf(200, (ago) => {
			if (ago < 21) return { hrv: 70, resting_hr: 50, stress: 30, sleep_score: 80 };
			return ago % 10 === 0 ? { resting_hr: 50, stress: 10, sleep_score: 80 } : { resting_hr: 60, stress: 50, sleep_score: 50 };
		});
		expect(personalBest(index, END, "hrv")).toBe(70);
		expect(personalBest(index, END, "stress")).not.toBeNull();
	});

	it("needs 14 days with at least three metrics that have the metric", async () => {
		const index = await indexOf(200, (ago) => (ago < 13 ? { hrv: 70, resting_hr: 50, stress: 10, sleep_score: 80 } : { resting_hr: 50, stress: 10, sleep_score: 80 }));
		expect(personalBest(index, END, "hrv")).toBeNull();
		expect(personalBest(index, END, "stress")).not.toBeNull();
	});

	it("needs at least three metrics on a day", async () => {
		const index = await indexOf(200, () => ({ hrv: 70, resting_hr: 50 }));
		expect(personalBest(index, END, "hrv")).toBeNull();
	});

	it("uses only the days before the shown one", async () => {
		const index = await indexOf(200, ordinary);
		// 9 earlier days are fewer than the 14 needed; the days after the shown one do not count
		expect(personalBest(index, shiftDate(END, -190), "hrv")).toBeNull();
		expect(personalBest(index, shiftDate(END, -150), "hrv")).not.toBeNull();
	});

	it("takes the middle value of the best days, so one spike among them does not count", async () => {
		const index = await indexOf(200, (ago) => ({ hrv: ago === 20 ? 900 : 100, resting_hr: 50, stress: 10, sleep_score: 80 }));
		expect(personalBest(index, END, "hrv")).toBe(100);
	});

	it("takes at most the 30 best days of a long history", async () => {
		// the days differ in HRV only, so the 30 best are the days with the highest HRV
		const index = await indexOf(900, (ago) => ({ hrv: ago % 4 === 3 ? 10 : 100 + (ago % 97), resting_hr: 50, stress: 10, sleep_score: 80 }));
		const best = personalBest(index, END, "hrv")!;
		expect(best).toBeGreaterThan(190);
		expect(best).toBeLessThanOrEqual(196);
	});

	it("is worked out once for a draw and again when the notes change", async () => {
		const app = new App();
		await seedHistory(app, { end: END, days: 200, frontmatter: ordinary });
		const index = new DayIndex(app as never, () => settings);
		expect(personalBest(index, END, "hrv")).toBe(100);
		const spy = vi.spyOn(index, "dates");
		expect(personalBest(index, END, "stress")).toBe(10);
		expect(spy).not.toHaveBeenCalled();
		index.touch();
		expect(personalBest(index, END, "stress")).toBe(10);
		expect(spy).toHaveBeenCalledTimes(1);
	});
});

describe("rank among all days", () => {
	it("needs 180 earlier days with a value", async () => {
		expect(historyRank(await indexOf(100, () => ({ hrv: 50 })), END, "hrv")).toBeNull();
		expect(historyRank(await indexOf(181, () => ({ hrv: 50 })), END, "hrv")).toMatchObject({ n: 180, since: shiftDate(END, -180) });
	});

	it("ranks the shown day in the better direction", async () => {
		const index = await indexOf(200, (ago) => ({ hrv: ago === 0 ? 90 : 40 + (ago % 20), resting_hr: ago === 0 ? 40 : 50 + (ago % 20) }));
		expect(historyRank(index, END, "hrv")!.share).toBeGreaterThan(0.95);
		// a resting heart rate below all the others is the best rank
		expect(historyRank(index, END, "resting_hr")!.share).toBeGreaterThan(0.95);
	});

	it("says nothing without a value on the shown day, or for another metric", async () => {
		const index = await indexOf(200, (ago) => (ago === 0 ? { steps: 1 } : { hrv: 50 }));
		expect(historyRank(index, END, "hrv")).toBeNull();
		expect(historyRank(index, END, "respiration_rate")).toBeNull();
	});

	it("does not rank steps, the body battery peak and stress of a day that is not over", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 9, 22, 10, 0, 0));
		try {
			const index = await indexOf(200, (ago) => ({ steps: ago === 0 ? 100 : 8000 + ago, stress: ago === 0 ? 5 : 40 + (ago % 9), hrv: ago === 0 ? 20 : 50 + (ago % 5) }));
			expect(historyRank(index, END, "steps")).toBeNull();
			expect(historyRank(index, END, "stress")).toBeNull();
			expect(historyRank(index, END, "hrv")).not.toBeNull();
			expect(historyRank(index, shiftDate(END, -1), "steps")).not.toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it("bundles the rank and the best for a card", async () => {
		const index = await indexOf(200, ordinary);
		expect(historyView(index, END, "hrv")).toEqual({ rank: historyRank(index, END, "hrv"), best: 100 });
	});
});

describe("the lines under the light bulb", () => {
	const format = (n: number): string => `${n} ms`;

	it("says where the day ranks and what the best days average, in the plugin language", () => {
		const rank = { share: 0.644, n: 1540, since: "2022-03-05" };
		expect(historyFacts(rank, "en")).toEqual(["Better than 64% of your 1,540 days with data since 2022-03"]);
		expect(bestFact(71, format, "en")).toBe("Your best days average 71 ms (diamond on the bar)");
		expect(historyFacts(null, "en")).toEqual([]);
		expect(bestFact(null, format, "de")).toBeUndefined();
	});

	async function signalsOf(days: number, today: number): Promise<Signals> {
		const index = await indexOf(days, (ago) => ({ hrv: ago === 0 ? today : 40 + (ago % 20) }));
		return new Signals(index, END, null);
	}

	it("adds a line for a day among the best tenth, and one for a day among the weakest", async () => {
		const top = withHistory(await signalsOf(200, 90), "hrv", []);
		expect(top).toEqual([{ id: "history_top", params: expect.objectContaining({ n: "199" }) }]);
		expect(insightText(top[0]!, "en")).toMatch(/^One of your best days: better than \d+% of your 199 days since 2026-\d\d\.$/);
		const bottom = withHistory(await signalsOf(200, 10), "hrv", []);
		expect(bottom[0]!.id).toBe("history_bottom");
		expect(insightText(bottom[0]!, "en")).toContain("One of your weaker days: better than only 0% of your 199 days");
	});

	it("adds nothing for an ordinary day, a young history, or a card that has its three lines", async () => {
		expect(withHistory(await signalsOf(200, 50), "hrv", [])).toEqual([]);
		expect(withHistory(await signalsOf(100, 90), "hrv", [])).toEqual([]);
		const full = [{ id: "hrv_in_range" }, { id: "hrv_trend_up" }, { id: "unexplained" }] as const;
		expect(withHistory(await signalsOf(200, 90), "hrv", [...full])).toEqual(full);
	});
});

describe("the diamond on the bars", () => {
	let root: HTMLElement;
	beforeEach(() => {
		root = document.createElement("div");
	});
	afterEach(() => vi.useRealTimers());
	const diamond = (): HTMLElement | null => root.querySelector<HTMLElement>(".ghs-best");

	it("sits on the range bars of HRV, resting heart rate and SpO2 with its number as the label", async () => {
		const index = await indexOf(200, ordinary);
		renderRange(root, HRV_CARD, computeRange(HRV_CARD, index, END), "en", true, () => undefined);
		expect(diamond()!.getAttribute("title")).toBe("Best days: 100 ms");
		expect(root.querySelector(".ghs-range")!.getAttribute("aria-label")).toContain("Best days: 100 ms");
		expect(diamond()!.style.getPropertyValue("--ghs-x")).toMatch(/%$/);
		// the line that explains the diamond is marked, so it can carry the diamond's colour
		expect(root.querySelector(".ghs-fact-best")!.textContent).toBe("Your best days average 100 ms (diamond on the bar)");
		for (const spec of [RESTING_HR_CARD, SPO2_CARD]) {
			root.replaceChildren();
			renderRange(root, spec, computeRange(spec, index, END), "en", false, () => undefined);
			expect(diamond()).not.toBeNull();
		}
	});

	it("stops at the edge of the usual range on a bar where too high is flagged too, and goes on where it is not", async () => {
		// the best days far above the usual HRV: the diamond waits at the upper tick instead of sitting on the orange
		const index = await indexOf(200, (ago) => (ago < 30 ? { hrv: 50 + (ago % 2), resting_hr: 60, stress: 40, sleep_score: 50 } : ago % 3 === 0 ? { hrv: 120, resting_hr: 40, stress: 10, sleep_score: 95 } : { hrv: 50, resting_hr: 60, stress: 40, sleep_score: 50 }));
		renderRange(root, HRV_CARD, computeRange(HRV_CARD, index, END), "en", false, () => undefined);
		const ticks = Array.from(root.querySelectorAll<HTMLElement>(".ghs-tick")).map((t) => t.style.getPropertyValue("--ghs-x"));
		expect(diamond()!.style.getPropertyValue("--ghs-x")).toBe(ticks[1]);
		root.replaceChildren();
		renderRange(root, RESTING_HR_CARD, computeRange(RESTING_HR_CARD, index, END), "en", false, () => undefined);
		expect(parseFloat(diamond()!.style.getPropertyValue("--ghs-x"))).toBeLessThan(parseFloat(root.querySelectorAll<HTMLElement>(".ghs-tick")[0]!.style.getPropertyValue("--ghs-x")));
	});

	it("is left out of the range bar when there is no best", async () => {
		renderRange(root, HRV_CARD, computeRange(HRV_CARD, await indexOf(40, () => ({ hrv: 50 })), END), "en", true, () => undefined);
		expect(diamond()).toBeNull();
	});

	it("is on the stress, steps and body battery bars", async () => {
		const index = await indexOf(200, ordinary);
		renderStress(root, computeStress(index, END), "en", true, () => undefined);
		expect(diamond()!.getAttribute("title")).toBe("Best days: 10");
		root.replaceChildren();
		renderSteps(root, computeSteps(index, END), "en", true, () => undefined);
		expect(diamond()!.getAttribute("title")).toBe("Best days: 12,000");
		root.replaceChildren();
		renderBattery(root, computeBattery(index, END), "en", true, () => undefined);
		expect(diamond()!.getAttribute("title")).toBe("Best days: 100");
	});

	it("is not drawn on a bar that has no value to set it against", async () => {
		const index = await indexOf(200, (ago) => (ago === 0 ? {} : ordinary(ago)));
		renderStress(root, computeStress(index, END), "en", true, () => undefined);
		expect(diamond()).toBeNull();
	});

	it("keeps the year facts on the stress, body battery and floors cards", async () => {
		const index = await indexOf(100, () => ({ stress: 30, body_battery_max: 80, floors: 10 }));
		for (const draw of [() => renderStress(root, computeStress(index, END), "en", true, () => undefined), () => renderBattery(root, computeBattery(index, END), "en", true, () => undefined), () => renderFloors(root, computeFloors(index, END), "en", true, () => undefined)]) {
			root.replaceChildren();
			draw();
			expect(root.querySelector(".ghs-fact")!.textContent).toContain("Last year (100 days with data)");
		}
	});
});

describe("all the days that exist", () => {
	it("lists the days of the notes and the history notes together, oldest first", async () => {
		const app = new App();
		await seedHistory(app, { end: "2026-10-03", days: 2, frontmatter: () => ({ hrv: 50 }) });
		app.vault.seed("Garmin history/Garmin history 2022-03.md", serializeMonth("2022-03", new Map([["2022-03-05", { hrv: 51 }], ["2026-10-03", { hrv: 52 }]])));
		const history = new HistoryStore(app as never, { dailyNotePath: "" });
		await history.warm("2022-03-01", "2026-10-31");
		const index = new DayIndex(app as never, () => settings, history);
		expect(index.dates()).toEqual(["2022-03-05", "2026-10-02", "2026-10-03"]);
		expect(index.dates()).toBe(index.dates());
	});

	it("knows the month of the oldest history note", () => {
		const app = new App();
		const store = new HistoryStore(app as never, { dailyNotePath: "" });
		expect(store.firstMonth()).toBeNull();
		for (const month of ["2026-10", "2022-03", "2024-07"]) app.vault.seed(`Garmin history/Garmin history ${month}.md`, serializeMonth(month, new Map()));
		app.vault.seed("Notes/Garmin history 2019-01 notes.txt", "x");
		// the empty answer was kept: a history note changed (here: appeared) is what makes the store look again
		expect(store.firstMonth()).toBeNull();
		store.invalidate();
		expect(store.firstMonth()).toBe("2022-03");
		// a stray note named for a year that cannot be history is not where the history starts
		app.vault.seed("Notes/Garmin history 0001-01.md", "x");
		store.invalidate();
		expect(store.firstMonth()).toBe("2022-03");
		// the answer is kept (the panel asks on every draw) until a history note changes
		const spy = vi.spyOn(app.vault, "getMarkdownFiles");
		app.vault.seed("Garmin history/Garmin history 2020-05.md", serializeMonth("2020-05", new Map()));
		expect(store.firstMonth()).toBe("2022-03");
		expect(spy).not.toHaveBeenCalled();
		store.invalidate(app.vault.getAbstractFileByPath("Garmin history/Garmin history 2020-05.md") as never);
		expect(store.firstMonth()).toBe("2020-05");
	});
});
