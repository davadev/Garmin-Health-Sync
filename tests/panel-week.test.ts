// Why it matters: the Readiness score and the HRV card judge the last week, not one night. A baseline that contains
// the week hides a low week, a missing night counted as low raises false alarms, and an average built on two nights
// is a guess shown as a fact.
import { describe, expect, it } from "vitest";
import { App } from "../testUtils/mocks/obsidian";
import { seedHistory } from "../testUtils/fakeHistory";
import { DayIndex } from "../src/panel/index";
import { computeWeek } from "../src/panel/week";

const settings = { dailyNotePath: "", dailyNoteFormat: "YYYY-MM-DD" };
const END = "2026-10-22";

async function weekOf(hrv: (ago: number) => number | null, days = 80): Promise<ReturnType<typeof computeWeek>> {
	const app = new App();
	await seedHistory(app, { end: END, days, frontmatter: (ago) => { const v = hrv(ago); return v === null ? null : { hrv: v }; } });
	return computeWeek(new DayIndex(app as never, () => settings), "hrv", END);
}

describe("computeWeek", () => {
	it("lists 14 nights, the shown night last, and averages them over 7 nights", async () => {
		const w = await weekOf((ago) => 60 + ago);
		expect(w.nights).toHaveLength(14);
		expect(w.nights[13]).toBe(60);
		expect(w.nights[0]).toBe(73);
		expect(w.coverage).toBe(7);
		// geometric mean of 60..66 lies a little under the arithmetic mean 63
		expect(w.average!).toBeGreaterThan(62.8);
		expect(w.average!).toBeLessThan(63);
	});

	it("needs 3 of 7 nights to draw an average and 4 to judge the week", async () => {
		const sparse = (keep: number) => weekOf((ago) => (ago < 7 ? (ago < keep ? 60 : null) : 60));
		expect((await sparse(2)).average).toBeNull();
		expect((await sparse(3)).average).not.toBeNull();
		expect((await sparse(3)).z).toBeNull();
		expect((await sparse(4)).z).not.toBeNull();
	});

	it("never counts a missing night as a low one", async () => {
		const full = await weekOf(() => 60);
		const holes = await weekOf((ago) => (ago === 1 || ago === 3 ? null : 60));
		expect(holes.average).toBeCloseTo(full.average!, 6);
		expect(holes.z).toBeCloseTo(full.z!, 6);
	});

	it("compares the week with the nights before it, so a low week cannot hide itself", async () => {
		const w = await weekOf((ago) => (ago < 7 ? 40 : 60 + (ago % 2 === 0 ? 3 : -3)));
		expect(w.band!.mean).toBeCloseTo(60, 0);
		expect(w.average!).toBeCloseTo(40, 3);
		expect(w.z!).toBeLessThan(-3);
	});

	it("builds the band as the baseline mean +/- three quarters of a standard deviation, on the log scale", async () => {
		const w = await weekOf((ago) => (ago % 2 === 0 ? 50 : 70));
		const b = w.band!;
		expect(b.low).toBeLessThan(b.mean);
		expect(b.high).toBeGreaterThan(b.mean);
		// log scale: the band is symmetric in ratio, not in ms
		expect(b.high / b.mean).toBeCloseTo(b.mean / b.low, 6);
	});

	it("keeps the band at least 6 percent wide for a very steady sleeper", async () => {
		const w = await weekOf(() => 60);
		expect(w.band!.high / w.band!.mean).toBeCloseTo(Math.exp(0.03), 6);
	});

	it("has no band and no judgement while the baseline rests on fewer than 14 nights", async () => {
		const w = await weekOf((ago) => (ago < 7 + 13 ? 60 : null), 80);
		expect(w.band).toBeNull();
		expect(w.z).toBeNull();
		expect(w.average).not.toBeNull();
	});

	it("leaves out the freak reading of a sensor error like the usual range does", async () => {
		const w = await weekOf((ago) => (ago === 20 ? 400 : 60 + (ago % 2 === 0 ? 2 : -2)));
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
