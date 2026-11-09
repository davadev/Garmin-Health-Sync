// Why it matters: the trend line says whether a number is moving. A trend from two good days, one that calls
// a 1 % wobble a change, or one that mixes up the two weeks would mislead; missing days must stay missing.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App, WorkspaceLeaf } from "../testUtils/mocks/obsidian";
import { seedHistory } from "../testUtils/fakeHistory";
import { HealthPanelView } from "../src/panel/view";
import { DEFAULT_SETTINGS } from "../src/settings";
import { computeTrend, renderTrend } from "../src/panel/trend";
import { en } from "../src/i18n/en";
import { de } from "../src/i18n/de";

const END = "2026-10-22";
/** Values by days before END; anything not listed is missing. */
const reader = (byAgo: Record<number, number>) => (date: string): number | null => {
	const ago = Math.round((Date.UTC(2026, 9, 22) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);
	return byAgo[ago] ?? null;
};
const days = (from: number, to: number, value: number): Record<number, number> => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, value]));

describe("computeTrend", () => {
	it("compares the last 7 days, the shown day included, with the 7 before", () => {
		const t = computeTrend(reader({ ...days(0, 6, 60), ...days(7, 13, 50) }), END)!;
		expect(t.direction).toBe("up");
		expect(t.delta).toBe(10);
		expect(t.series).toHaveLength(14);
		expect(t.series[13]).toBe(60); // the shown day last
		expect(t.series[0]).toBe(50);
	});

	it("goes down", () => {
		const t = computeTrend(reader({ ...days(0, 6, 40), ...days(7, 13, 50) }), END)!;
		expect(t.direction).toBe("down");
		expect(t.delta).toBe(-10);
	});

	it("calls a change under 2 percent of the earlier week steady", () => {
		expect(computeTrend(reader({ ...days(0, 6, 100.9), ...days(7, 13, 100) }), END)!.direction).toBe("steady");
		expect(computeTrend(reader({ ...days(0, 6, 102.5), ...days(7, 13, 100) }), END)!.direction).toBe("up");
	});

	it("needs at least 4 values in each week", () => {
		expect(computeTrend(reader({ ...days(0, 2, 60), ...days(7, 13, 50) }), END)).toBeNull();
		expect(computeTrend(reader({ ...days(0, 6, 60), ...days(7, 9, 50) }), END)).toBeNull();
		expect(computeTrend(reader({ ...days(0, 3, 60), ...days(7, 10, 50) }), END)).not.toBeNull();
	});

	it("keeps missing days as null in the series", () => {
		const t = computeTrend(reader({ ...days(0, 5, 60), ...days(7, 13, 50) }), END)!;
		expect(t.series[7]).toBeNull();
	});
});

describe("renderTrend", () => {
	let root: HTMLElement;
	beforeEach(() => {
		root = document.createElement("div");
	});
	const fmt = (n: number): string => `${n} ms`;
	const text = (): string => root.querySelector(".ghs-trend-text")?.textContent ?? "";

	it("draws nothing without a trend", () => {
		renderTrend(root, { trend: null, format: fmt }, "en");
		expect(root.children).toHaveLength(0);
	});

	it("draws 14 bars, the last one marked, and a line with an arrow and the signed change", () => {
		renderTrend(root, { trend: computeTrend(reader({ ...days(0, 6, 60), ...days(7, 13, 50) }), END), format: fmt }, "en");
		expect(root.querySelectorAll(".ghs-trend-bar")).toHaveLength(14);
		expect(root.querySelectorAll(".ghs-trend-bar-last")).toHaveLength(1);
		expect(text()).toBe("↑ +10 ms vs the week before");
	});

	it("writes a fall with a minus sign and a down arrow", () => {
		renderTrend(root, { trend: computeTrend(reader({ ...days(0, 6, 40), ...days(7, 13, 50) }), END), format: fmt }, "en");
		expect(text()).toBe("↓ −10 ms vs the week before");
	});

	it("says steady without a number", () => {
		renderTrend(root, { trend: computeTrend(reader({ ...days(0, 13, 50) }), END), format: fmt }, "en");
		expect(text()).toBe(`→ ${en.panelTrendSteady}`);
	});

	it("scales the bars between the lowest and the highest day and draws missing days flat", () => {
		renderTrend(root, { trend: computeTrend(reader({ ...days(0, 4, 60), 6: 40, ...days(7, 13, 50) }), END), format: fmt }, "en");
		const bars = Array.from(root.querySelectorAll<HTMLElement>(".ghs-trend-bar"));
		const h = (i: number): string => bars[i]!.style.getPropertyValue("--ghs-h");
		expect(h(13)).toBe("100%"); // 60 is the highest
		expect(h(8)).toBe("0%"); // the day with no value (5 days before)
		expect(bars[8]!.classList.contains("ghs-trend-bar-missing")).toBe(true);
		expect(h(0)).toBe(`${25 + ((50 - 40) / 20) * 75}%`);
	});

	it("draws a flat series at the middle", () => {
		renderTrend(root, { trend: computeTrend(reader({ ...days(0, 13, 50) }), END), format: fmt }, "en");
		expect((root.querySelector(".ghs-trend-bar") as HTMLElement).style.getPropertyValue("--ghs-h")).toBe("60%");
	});

	it("speaks the plugin language", () => {
		renderTrend(root, { trend: computeTrend(reader({ ...days(0, 6, 60), ...days(7, 13, 50) }), END), format: fmt }, "de");
		expect(text()).toBe("↑ +10 ms zur Woche davor");
		expect(de.panelTrend).toContain("{delta}");
	});
});

describe("trend lines in the cards", () => {
	// the last 7 days are 10 higher than the 7 before for every metric
	const rising = (ago: number): Record<string, unknown> => {
		const up = ago < 7 ? 10 : 0;
		const dur = (m: number): string => `${Math.floor(m / 60)}h ${m % 60}min`;
		return {
			hrv: 40 + up, resting_hr: 50 + up, spo2: 90 + up / 5, respiration_rate: 14 + up / 10, sleep_duration: dur(400 + up), steps: 8000 + up * 100,
			body_battery_max: 70 + up, stress: 30 + up, floors: 8 + up / 5,
		};
	};

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 9, 22, 10));
	});
	afterEach(() => vi.useRealTimers());

	it("shows a trend line in every card that has one, each in its own unit", async () => {
		const app = new App();
		await seedHistory(app, { end: "2026-10-22", days: 28, frontmatter: rising });
		const view = new HealthPanelView(new WorkspaceLeaf(app) as never, { settings: { ...DEFAULT_SETTINGS } } as never);
		await view.onOpen();
		const lines = (title: string): string | undefined => {
			const card = Array.from(view.contentEl.querySelectorAll(".ghs-card")).find((c) => c.querySelector(".ghs-card-title")?.textContent === title);
			return card?.querySelector(".ghs-trend-text")?.textContent ?? undefined;
		};
		// the HRV and resting heart rate cards show their 14 nights with the 7-night average instead of the two-week trend line
		expect(lines(en.panelHrvTitle)).toBeUndefined();
		expect(lines(en.panelRestingHrTitle)).toBeUndefined();
		expect(lines(en.panelSpo2Title)).toBe("↑ +2 % vs the week before");
		expect(lines(en.panelBreathingTitle)).toBe("↑ +1 /min vs the week before");
		expect(lines(en.panelSleepTitle)).toBe("↑ +10 min vs the week before");
		expect(lines(en.panelBatteryTitle)).toBe("↑ +10 vs the week before");
		expect(lines(en.panelStressTitle)).toBe("↑ +10 vs the week before");
		expect(lines(en.panelStepsTitle)).toBe("↑ +1,000 vs the week before");
		expect(lines(en.panelFloorsTitle)).toBe("↑ +2 vs the week before");
		// no trend for the cards that are a composition or a weekly plan
		expect(lines(en.panelStagesTitle)).toBeUndefined();
		expect(lines(en.panelIntensityTitle)).toBeUndefined();
	});
});
