// Why it matters: the HRV card is the first thing the panel tells the user. Each state has to say the right
// thing: a missing reading must never look like a value, a young history must say why there is no range
// yet, and the colour has to follow the distance from the user's own average.
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../testUtils/mocks/obsidian";
import { seedHistory } from "../testUtils/fakeHistory";
import { DayIndex } from "../src/panel/index";
import { computeRange, renderRange, HRV_CARD, RESTING_HR_CARD, SPO2_CARD, RANGE_EARLY_MIN_DAYS as HRV_EARLY_MIN_DAYS, RANGE_MIN_DAYS as HRV_MIN_DAYS, type RangeCardSpec } from "../src/panel/cards/range-card";
import { en } from "../src/i18n/en";
import { de } from "../src/i18n/de";

const settings = { dailyNotePath: "", dailyNoteFormat: "YYYY-MM-DD" };
const END = "2026-10-22";

/** 30 prior days alternating 58 / 62 (mean 60, sd 2), then the shown day. */
async function indexWith(today: number | null, prior = 30): Promise<DayIndex> {
	const app = new App();
	await seedHistory(app, {
		end: END,
		days: prior + 1,
		frontmatter: (ago) => (ago === 0 ? (today === null ? null : { hrv: today }) : { hrv: ago % 2 === 0 ? 62 : 58 }),
	});
	return new DayIndex(app as never, () => settings);
}

let root: HTMLElement;
beforeEach(() => {
	root = document.createElement("div");
});
const computeHrv = (index: DayIndex, date: string): ReturnType<typeof computeRange> => computeRange(HRV_CARD, index, date);
const render = (model: ReturnType<typeof computeRange>, lang = "en", open = false, toggle = () => undefined, spec: RangeCardSpec = HRV_CARD): void => renderRange(root, spec, model, lang, open, toggle);
const text = (sel: string): string => root.querySelector(sel)?.textContent ?? "";

describe("computeHrv", () => {
	it("compares the day with the average of the 30 days before it", async () => {
		const m = computeHrv(await indexWith(66), END);
		expect(m.value).toBe(66);
		expect(m.have).toBe(30);
		expect(m.baseline).toEqual({ mean: 60, sd: 2, n: 30 });
		expect(m.z).toBe(3);
	});

	it("has no range with fewer than the early minimum, but still reports the value", async () => {
		const m = computeHrv(await indexWith(60, HRV_EARLY_MIN_DAYS - 1), END);
		expect(m.baseline).toBeNull();
		expect(m.have).toBe(HRV_EARLY_MIN_DAYS - 1);
		expect(m.z).toBeNull();
		expect(m.value).toBe(60);
	});

	it("gives an early range from the early minimum and a reliable one from 21 days", async () => {
		const early = computeHrv(await indexWith(60, HRV_EARLY_MIN_DAYS), END);
		expect(early.baseline).not.toBeNull();
		expect(early.early).toBe(true);
		expect(computeHrv(await indexWith(60, HRV_MIN_DAYS - 1), END).early).toBe(true);
		expect(computeHrv(await indexWith(60, HRV_MIN_DAYS), END).early).toBe(false);
	});

	it("keeps the range when the day has no reading", async () => {
		const m = computeHrv(await indexWith(null), END);
		expect(m.value).toBeNull();
		expect(m.z).toBeNull();
		expect(m.baseline).not.toBeNull();
	});
});

describe("renderHrv", () => {
	it("shows the value, the usual range and a green dot inside it", async () => {
		render(computeHrv(await indexWith(61), END));
		expect(text(".ghs-card-title")).toBe("HRV");
		expect(text(".ghs-card-value")).toBe("61 ms · Last night");
		expect(root.querySelector(".ghs-range")?.getAttribute("aria-label")).toBe("Usual range 58–62 ms");
		expect(Array.from(root.querySelectorAll(".ghs-tick-label")).map((e) => e.textContent)).toEqual(["58", "62"]);
		expect(root.querySelectorAll(".ghs-tick")).toHaveLength(2);
		expect(root.querySelector(".ghs-range-track-both")).not.toBeNull();
		expect(root.querySelector(".ghs-dot-ok")).not.toBeNull();
	});

	it.each([
		[63, "ghs-dot-warn"],
		[54, "ghs-dot-bad"],
	])("colours %s by its distance from the personal average", async (value, cls) => {
		render(computeHrv(await indexWith(value), END));
		expect(root.querySelector(`.${cls}`)).not.toBeNull();
	});

	it("places the dot as a percentage and clamps outliers to the edge", async () => {
		render(computeHrv(await indexWith(60), END));
		expect((root.querySelector(".ghs-dot") as HTMLElement).style.getPropertyValue("--ghs-x")).toBe("50%");
		root.empty();
		render(computeHrv(await indexWith(200), END));
		expect((root.querySelector(".ghs-dot") as HTMLElement).style.getPropertyValue("--ghs-x")).toBe("100%");
		root.empty();
		render(computeHrv(await indexWith(1), END));
		expect((root.querySelector(".ghs-dot") as HTMLElement).style.getPropertyValue("--ghs-x")).toBe("0%");
	});

	it("says there is no reading, never a stale value, with a dashed card and no dot", async () => {
		render(computeHrv(await indexWith(null), END));
		expect(text(".ghs-card-value")).toBe(en.panelNoReading);
		expect(root.querySelector(".ghs-card-empty")).not.toBeNull();
		expect(root.querySelector(".ghs-dot")).toBeNull();
		expect(text(".ghs-card-note")).toBe("Usual range 58–62 ms");
	});

	it("shows the range of a young history with a warning that it is likely inaccurate", async () => {
		render(computeHrv(await indexWith(60, 10), END));
		const notes = Array.from(root.querySelectorAll(".ghs-card-note")).map((n) => n.textContent);
		expect(notes).toEqual(["Early estimate from 10 days, likely inaccurate until 21 days."]);
		expect(root.querySelector(".ghs-range")?.getAttribute("aria-label")).toBe("Usual range 58–62 ms");
		expect(root.querySelector(".ghs-card-warning")).not.toBeNull();
		expect(root.querySelector(".ghs-dot")).not.toBeNull();
	});

	it("warns on the HRV card when the low reading has lasted and nothing explains it", async () => {
		const model = computeHrv(await indexWith(60), END);
		render({ ...model, insights: [{ id: "hrv_low_streak", params: { n: "3" } }] });
		expect(text(".ghs-card-alert")).toBe("Below your usual range for 3 nights, nothing in your data explains it");
		root.replaceChildren();
		render({ ...model, insights: [] });
		expect(root.querySelector(".ghs-card-alert")).toBeNull();
	});

	it("shows no warning once the history is long enough", async () => {
		render(computeHrv(await indexWith(60), END));
		expect(root.querySelector(".ghs-card-warning")).toBeNull();
	});

	it("explains why there is no range yet", async () => {
		render(computeHrv(await indexWith(60, 3), END));
		expect(text(".ghs-card-note")).toBe("Unlocks after 5 days of data · 3 so far");
		expect(root.querySelector(".ghs-range")).toBeNull();
	});

	it("formats numbers and texts in the plugin language", async () => {
		render(computeHrv(await indexWith(61.4), END), "de");
		expect(text(".ghs-card-value")).toBe("61 ms · Letzte Nacht");
		expect(root.querySelector(".ghs-range")?.getAttribute("aria-label")).toBe("Üblicher Bereich 58–62 ms");
		expect(root.querySelector("button")?.getAttribute("aria-label")).toBe(de.panelInfo);
	});

	it("shows the explanation button as a light bulb", async () => {
		render(computeHrv(await indexWith(61), END));
		expect(root.querySelector(".ghs-info")?.getAttribute("data-icon")).toBe("lightbulb");
	});

	it("toggles the explanation behind the light bulb button", async () => {
		let toggled = 0;
		const model = computeHrv(await indexWith(61), END);
		render(model, "en", false, () => void toggled++);
		const info = root.querySelector("button") as HTMLButtonElement;
		expect(info.getAttribute("aria-expanded")).toBe("false");
		expect(root.querySelector(".ghs-explain")).toBeNull();
		info.click();
		expect(toggled).toBe(1);
		root.empty();
		render(model, "en", true);
		expect(root.querySelector("button")?.getAttribute("aria-expanded")).toBe("true");
		expect(text(".ghs-explain")).toBe(en.panelHrvExplain);
	});
});

describe("resting heart rate card", () => {
	/** 30 prior days alternating 58 / 62 bpm (mean 60, sd 2). */
	async function rhr(today: number): Promise<DayIndex> {
		const app = new App();
		await seedHistory(app, { end: END, days: 31, frontmatter: (ago) => ({ resting_hr: ago === 0 ? today : ago % 2 === 0 ? 62 : 58 }) });
		return new DayIndex(app as never, () => settings);
	}
	const tone = async (value: number): Promise<string | undefined> => {
		root.empty();
		render(computeRange(RESTING_HR_CARD, await rhr(value), END), "en", false, () => undefined, RESTING_HR_CARD);
		return Array.from(root.querySelector(".ghs-dot")?.classList ?? []).find((c) => c.startsWith("ghs-dot-"));
	};

	it("titles the card and shows bpm", async () => {
		await tone(60);
		expect(text(".ghs-card-title")).toBe(en.panelRestingHrTitle);
		expect(text(".ghs-card-value")).toBe("60 bpm · Today");
		expect(root.querySelector(".ghs-range")?.getAttribute("aria-label")).toBe("Usual range 58–62 bpm");
		expect(root.querySelector(".ghs-range-track-high")).not.toBeNull();
	});

	it("is green at or below the usual, however low", async () => {
		expect(await tone(60)).toBe("ghs-dot-ok");
		expect(await tone(40)).toBe("ghs-dot-ok");
	});

	it("is amber more than one deviation or 3 bpm above and red beyond two deviations or 5 bpm", async () => {
		expect(await tone(62.5)).toBe("ghs-dot-warn"); // z 1.25
		expect(await tone(63)).toBe("ghs-dot-warn"); // +3 bpm
		expect(await tone(64.5)).toBe("ghs-dot-bad"); // z 2.25
		expect(await tone(65)).toBe("ghs-dot-bad"); // +5 bpm
	});

	it("uses its own explanation", async () => {
		root.empty();
		render(computeRange(RESTING_HR_CARD, await rhr(60), END), "en", true, () => undefined, RESTING_HR_CARD);
		expect(text(".ghs-explain")).toBe(en.panelRestingHrExplain);
	});
});

describe("the week chart on the HRV card", () => {
	it("draws the nights with their average on the HRV card and keeps the range bar", async () => {
		const m = computeHrv(await indexWith(60), END);
		expect(m.week?.nights).toHaveLength(14);
		render(m);
		expect(root.querySelectorAll(".ghs-hrvweek .ghs-night-bar")).toHaveLength(14);
		expect(root.querySelector(".ghs-range")).not.toBeNull();
		expect(root.querySelector(".ghs-trend-text")).toBeNull();
	});

	it("draws the same chart for the resting heart rate, with the high side as the bad one", async () => {
		const app = new App();
		await seedHistory(app, { end: END, days: 80, frontmatter: (ago) => ({ resting_hr: ago < 7 ? 60 : 50 + (ago % 2 === 0 ? 1 : -1) }) });
		const m = computeRange(RESTING_HR_CARD, new DayIndex(app as never, () => settings), END);
		expect(m.week?.average).toBeCloseTo(60, 3);
		render(m, "en", false, () => undefined, RESTING_HR_CARD);
		expect(text(".ghs-card-value")).toBe("60 bpm · Today");
		expect(text(".ghs-hrvweek-status")).toContain("7-day avg 60 bpm");
		// above the usual is the bad side here, not below
		expect(root.querySelector(".ghs-hrvweek-below")).not.toBeNull();
		expect(root.querySelector(".ghs-trend-text")).toBeNull();
	});

	it("leaves the cards without a week chart on their trend line", async () => {
		const index = await indexWith(60);
		const m = computeRange(SPO2_CARD, index, END);
		expect(m.week).toBeNull();
		render(m, "en", false, () => undefined, SPO2_CARD);
		expect(root.querySelector(".ghs-hrvweek")).toBeNull();
	});
});

describe("the long-term change on the HRV card", () => {
	/** 200 days: the last 90 average `recent`, the 90 before `prior`, a night-to-night swing of 2. */
	async function longIndex(recent: number, prior: number): Promise<DayIndex> {
		const app = new App();
		await seedHistory(app, { end: END, days: 200, frontmatter: (ago) => ({ hrv: (ago < 90 ? recent : prior) + (ago % 2 === 0 ? 2 : -2) }) });
		return new DayIndex(app as never, () => settings);
	}

	it("says how far the 90 day average moved, and that the unit of the headline is last night", async () => {
		render(computeHrv(await longIndex(64, 58), END));
		expect(text(".ghs-hrvweek-long")).toBe("↑ 6 ms over 90 days");
		expect(text(".ghs-card-value")).toBe("66 ms · Last night");
		root.replaceChildren();
		render(computeHrv(await longIndex(52, 58), END));
		expect(text(".ghs-hrvweek-long")).toContain("↓ 6 ms");
	});

	it("calls a change within the usual swing steady and shows nothing without 60 days of data", async () => {
		render(computeHrv(await longIndex(59, 58), END));
		expect(text(".ghs-hrvweek-long")).toBe(en.panelWeekLongSteady);
		root.replaceChildren();
		render(computeHrv(await indexWith(60), END));
		expect(root.querySelector(".ghs-hrvweek-long")).toBeNull();
	});
});
