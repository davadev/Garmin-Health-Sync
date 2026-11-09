// Why it matters: the HRV and resting heart rate cards judge the last week, not one night, against the same usual range
// as their range bar. A band that differs from the bar shows "in range" above and "below" underneath, a missing night
// counted as low raises false alarms, and an average built on two nights is a guess shown as a fact.
import { describe, expect, it } from "vitest";
import { App } from "../testUtils/mocks/obsidian";
import { seedHistory } from "../testUtils/fakeHistory";
import { DayIndex } from "../src/panel/index";
import { computeRange, HRV_CARD } from "../src/panel/cards/range-card";
import { computeWeek } from "../src/panel/week";

const settings = { dailyNotePath: "", dailyNoteFormat: "YYYY-MM-DD" };
const END = "2026-10-22";

async function indexOf(hrv: (ago: number) => number | null, days = 80): Promise<DayIndex> {
	const app = new App();
	await seedHistory(app, { end: END, days, frontmatter: (ago) => { const v = hrv(ago); return v === null ? null : { hrv: v }; } });
	return new DayIndex(app as never, () => settings);
}
const weekOf = async (hrv: (ago: number) => number | null, days = 80): Promise<ReturnType<typeof computeWeek>> => computeWeek(await indexOf(hrv, days), "hrv", END, 2);
const alt = (ago: number, a = 62, b = 58): number => (ago % 2 === 0 ? a : b);

describe("computeWeek", () => {
	it("lists 14 nights, the shown night last, and averages them over 7 nights", async () => {
		const w = await weekOf((ago) => 60 + ago);
		expect(w.nights).toHaveLength(14);
		expect(w.nights[13]).toBe(60);
		expect(w.nights[0]).toBe(73);
		expect(w.coverage).toBe(7);
		expect(w.average).toBe(63); // 60..66
		expect(w.avg[12]).toBe(64); // the night before: 61..67
	});

	it("needs 3 of 7 nights to draw an average and 4 to judge the week", async () => {
		const sparse = (keep: number) => weekOf((ago) => (ago < 7 ? (ago < keep ? 60 : null) : 60));
		expect((await sparse(2)).average).toBeNull();
		expect((await sparse(3)).average).not.toBeNull();
		expect((await sparse(3)).z).toBeNull();
		expect((await sparse(4)).z).not.toBeNull();
	});

	it("never counts a missing night as a low one", async () => {
		const full = await weekOf((ago) => alt(ago));
		const holes = await weekOf((ago) => (ago === 1 || ago === 2 ? null : alt(ago)));
		expect(holes.average!).toBeCloseTo(full.average!, 0);
		expect(holes.z!).toBeGreaterThan(-0.5);
		expect(Math.abs(holes.z! - full.z!)).toBeLessThan(0.5);
	});

	it("uses the usual range of the range bar: the same mean and standard deviation, one either side", async () => {
		const index = await indexOf((ago) => (ago < 7 ? 52 : alt(ago, 66, 62)));
		const bar = computeRange(HRV_CARD, index, END).baseline!;
		const w = computeWeek(index, "hrv", END, HRV_CARD.sdFloor);
		expect(w.band).toEqual({ low: bar.mean - bar.sd, mean: bar.mean, high: bar.mean + bar.sd });
	});

	it("judges a low week against that range", async () => {
		const w = await weekOf((ago) => (ago < 7 ? 52 : alt(ago, 66, 62)));
		expect(w.average).toBe(52);
		expect(w.average!).toBeLessThan(w.band!.low);
		expect(w.z!).toBeLessThan(-1);
	});

	it("keeps the band at least as wide as the floor for a very steady sleeper", async () => {
		const w = await weekOf(() => 60);
		expect(w.band).toEqual({ low: 58, mean: 60, high: 62 });
	});

	it("has no band and no judgement while the baseline rests on fewer than 5 days", async () => {
		const w = await weekOf(() => 60, 5);
		expect(w.band).toBeNull();
		expect(w.z).toBeNull();
		expect(w.average).toBe(60);
	});

	it("leaves out the freak reading of a sensor error like the range bar does", async () => {
		const w = await weekOf((ago) => (ago === 20 ? 400 : alt(ago)));
		expect(w.band!.mean).toBeCloseTo(60, 0);
	});

	it("ignores values that are not positive", async () => {
		const w = await weekOf((ago) => (ago === 0 ? 0 : 60));
		expect(w.nights[13]).toBeNull();
		expect(w.coverage).toBe(6);
	});

	it("reports runs of 3 or more missing nights as gaps, not 2", async () => {
		const w = await weekOf((ago) => (ago >= 5 && ago <= 7 ? null : ago === 10 || ago === 11 ? null : 60));
		expect(w.gaps).toEqual([{ from: 6, length: 3 }]);
	});

	it("reports a gap that reaches the shown night and one that starts the chart", async () => {
		const end = await weekOf((ago) => (ago <= 3 ? null : 60));
		expect(end.gaps).toEqual([{ from: 10, length: 4 }]);
		const start = await weekOf((ago) => (ago >= 11 ? null : 60), 80);
		expect(start.gaps).toEqual([{ from: 0, length: 3 }]);
	});
});
