// Why it matters: the long view is what the history notes are for. It must say nothing until there is a year
// worth of data to speak from, compare the last 90 days with the 90 before only when both have enough days,
// and show up under the light bulb of the cards it is meant for.
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../testUtils/mocks/obsidian";
import { seedHistory } from "../testUtils/fakeHistory";
import { DayIndex } from "../src/panel/index";
import { longFacts, longView } from "../src/panel/longview";
import { computeRange, renderRange, HRV_CARD } from "../src/panel/cards/range-card";
import { computeSteps, renderSteps } from "../src/panel/cards/steps-card";
import { computeVo2, renderVo2 } from "../src/panel/cards/vo2-card";
import { en } from "../src/i18n/en";
import { de } from "../src/i18n/de";

const END = "2026-10-22";
const settings = { dailyNotePath: "", dailyNoteFormat: "YYYY-MM-DD" };

describe("longView", () => {
	const from = (values: (ago: number) => number | null) => longView((day) => values(Math.round((Date.parse(`${END}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000)), END);

	it("needs 60 days with a value in the last year", () => {
		expect(from((ago) => (ago < 59 ? 50 : null))).toBeNull();
		expect(from((ago) => (ago < 60 ? 50 : null))).toMatchObject({ days: 60, avg: 50, min: 50, max: 50 });
	});

	it("gives the average, the lowest and the highest of the year and ignores days further back", () => {
		const view = from((ago) => (ago === 10 ? 20 : ago === 200 ? 80 : ago < 365 ? 50 : 999));
		expect(view).toMatchObject({ days: 365, min: 20, max: 80 });
		expect(view!.avg).toBeCloseTo((363 * 50 + 20 + 80) / 365, 6);
	});

	it("compares the last 90 days with the 90 before when both have 20 days of values", () => {
		const view = from((ago) => (ago < 90 ? 60 : ago < 180 ? 50 : null));
		expect(view).toMatchObject({ recent: 60, prior: 50 });
		expect(from((ago) => (ago < 90 ? 60 : ago < 105 ? 50 : ago < 200 ? null : 40))).toMatchObject({ recent: null, prior: null });
		expect(from((ago) => (ago < 70 ? 60 : null))).toMatchObject({ recent: null, prior: null });
	});
});

describe("longFacts", () => {
	const view = { days: 300, avg: 44.2, sd: 5, min: 30, max: 61, recent: 46, prior: 41 };
	const format = (n: number): string => `${Math.round(n)} ms`;

	it("writes the year and the comparison in the plugin language", () => {
		expect(longFacts(view, format, "en")).toEqual([
			"Last year (300 days with data): average 44 ms, lowest 30 ms, highest 61 ms",
			"Average of the last 90 days 46 ms, of the 90 days before 41 ms",
		]);
		expect(longFacts(view, format, "de")[0]).toBe(de.panelLongRange.replace("{n}", "300").replace("{avg}", "44 ms").replace("{min}", "30 ms").replace("{max}", "61 ms"));
	});

	it("leaves the comparison out when there is none, and everything out without a view", () => {
		expect(longFacts({ ...view, recent: null, prior: null }, format, "en")).toHaveLength(1);
		expect(longFacts(null, format, "en")).toEqual([]);
	});
});

describe("the long view under the light bulb", () => {
	let root: HTMLElement;
	beforeEach(() => {
		root = document.createElement("div");
	});

	async function index(days: number, values: (ago: number) => Record<string, unknown>): Promise<DayIndex> {
		const app = new App();
		await seedHistory(app, { end: END, days, frontmatter: values });
		return new DayIndex(app as never, () => settings);
	}
	const facts = (): string[] => Array.from(root.querySelectorAll(".ghs-fact")).map((e) => e.textContent ?? "");

	it("shows the year of an HRV card with its unit and the change of the last 90 days", async () => {
		const model = computeRange(HRV_CARD, await index(300, (ago) => ({ hrv: ago < 90 ? 46 : 40 })), END);
		renderRange(root, HRV_CARD, model, "en", true, () => undefined);
		expect(facts()).toEqual([
			expect.stringMatching(/^Last year \(300 days with data\): average 4\d ms, lowest 40 ms, highest 46 ms$/),
			"Average of the last 90 days 46 ms, of the 90 days before 40 ms",
			"Better than 85% of your 299 days with data since 2025-12",
		]);
	});

	it("shows nothing for a young history", async () => {
		renderRange(root, HRV_CARD, computeRange(HRV_CARD, await index(40, () => ({ hrv: 44 })), END), "en", true, () => undefined);
		expect(root.querySelector(".ghs-fact")).toBeNull();
	});

	it("is on the steps card and the VO2 max card", async () => {
		renderSteps(root, computeSteps(await index(100, () => ({ steps: 8000 })), END), "en", true, () => undefined);
		expect(facts()[0]).toBe("Last year (100 days with data): average 8,000, lowest 8,000, highest 8,000");
		root.replaceChildren();
		renderVo2(root, computeVo2(await index(100, () => ({ vo2_max: 48.5 })), END), "en", true, () => undefined);
		expect(facts()[0]).toBe("Last year (100 days with data): average 48.5 ml/kg/min, lowest 48.5 ml/kg/min, highest 48.5 ml/kg/min");
		expect(en.panelLongRange).toContain("{n}");
	});
});
