// Why it matters: the week chart is where a user tells one low night from a low week. The last night must stay a bar of
// its own, a gap must not be bridged by the line and a missing average must say so instead of drawing a guess.
import { describe, expect, it } from "vitest";
import { renderWeek, type LongChange } from "../src/panel/week-chart";
import type { WeekModel } from "../src/panel/week";
import { en } from "../src/i18n/en";
import { de } from "../src/i18n/de";

const nights = (v: (i: number) => number | null): (number | null)[] => Array.from({ length: 14 }, (_, i) => v(i));

function model(over: Partial<WeekModel> = {}): WeekModel {
	return {
		nights: nights(() => 60),
		avg: nights(() => 60),
		coverage: 7,
		band: { low: 56, mean: 60, high: 64 },
		average: 60,
		z: 0,
		gaps: [],
		...over,
	};
}

function draw(week: WeekModel, lang = "en", long: LongChange | null = null): HTMLElement {
	const parent = document.createElement("div");
	renderWeek(parent, week, "2026-10-22", lang, long);
	return parent;
}

describe("renderWeek", () => {
	it("draws 14 bars and marks the last night", () => {
		const el = draw(model());
		expect(el.querySelectorAll(".ghs-night-bar")).toHaveLength(14);
		const marked = el.querySelectorAll(".ghs-night-bar-last");
		expect(marked).toHaveLength(1);
		expect(el.querySelectorAll(".ghs-night-bar")[13]).toBe(marked[0]);
	});

	it("keeps the last night visible next to the average, with where the week stands", () => {
		const el = draw(model({ nights: nights((i) => (i === 13 ? 48 : 60)), average: 57, avg: nights(() => 57) }));
		const status = el.querySelector(".ghs-hrvweek-status")!.textContent!;
		// last night is the headline value of the card; a complete week does not name its nights
		expect(status).toContain("7-day avg 57 ms");
		expect(status).not.toContain("of 7 nights");
		expect(status).toContain(en.panelWeekIn);
		expect(el.querySelector(".ghs-hrvweek")!.getAttribute("aria-label")).toContain("Last night 48 ms");
	});

	it("says below or above the usual range when the average is outside the band", () => {
		const low = draw(model({ average: 50 }));
		expect(low.querySelector(".ghs-hrvweek-below")!.textContent).toContain(en.panelWeekBelow);
		const high = draw(model({ average: 70 }));
		expect(high.querySelector(".ghs-hrvweek-status")!.textContent).toContain(en.panelWeekAbove);
	});

	it("breaks the line at a night without an average instead of bridging it", () => {
		const avg = nights((i) => (i === 5 ? null : 60));
		const el = draw(model({ avg }));
		expect(el.querySelectorAll("polyline")).toHaveLength(2);
		expect(el.querySelector("svg")!.namespaceURI).toBe("http://www.w3.org/2000/svg");
	});

	it("draws no line from a single point", () => {
		const el = draw(model({ avg: nights((i) => (i === 13 ? 60 : null)) }));
		expect(el.querySelectorAll("polyline")).toHaveLength(0);
	});

	it("draws a dashed box with its length for nights without the watch", () => {
		const week = model({ nights: nights((i) => (i >= 4 && i <= 6 ? null : 60)), gaps: [{ from: 4, length: 3 }] });
		const el = draw(week);
		const box = el.querySelector<HTMLElement>(".ghs-hrvweek-gap")!;
		expect(box.getAttribute("title")).toBe("Watch off · 3 nights");
		expect(box.style.getPropertyValue("--ghs-x")).toBe(`${(4 / 14) * 100}%`);
		expect(el.querySelectorAll(".ghs-night-bar-missing")).toHaveLength(3);
	});

	it("says there are not enough nights instead of drawing an average", () => {
		const el = draw(model({ avg: nights(() => null), average: null, band: null, z: null, coverage: 2, nights: nights((i) => (i > 11 ? 60 : null)) }));
		expect(el.querySelector(".ghs-hrvweek-status")!.textContent).toContain(en.panelWeekNotEnough);
		expect(el.querySelectorAll("polyline")).toHaveLength(0);
		expect(el.querySelector(".ghs-hrvweek-band")).toBeNull();
	});

	it("draws nothing but the label when there is no value at all", () => {
		const el = draw(model({ nights: nights(() => null), avg: nights(() => null), average: null, band: null, z: null, coverage: 0 }));
		expect(el.querySelector(".ghs-hrvweek-chart")).toBeNull();
		expect(el.querySelector(".ghs-hrvweek")!.getAttribute("aria-label")).toBe(en.panelWeekNotEnough);
	});

	it("handles a flat week and describes the chart for screen readers in the language", () => {
		const el = draw(model(), "de");
		expect(el.querySelector(".ghs-hrvweek")!.getAttribute("role")).toBe("img");
		expect(el.querySelector(".ghs-hrvweek")!.getAttribute("aria-label")).toContain("Letzte Nacht 60 ms");
		expect(el.querySelector(".ghs-hrvweek")!.getAttribute("aria-label")).toContain(de.panelWeekIn);
	});

	it("names the nights the average rests on only when the week is not complete", () => {
		const el = draw(model({ coverage: 5 }));
		expect(el.querySelector(".ghs-hrvweek-status")!.textContent).toContain("7-day avg 60 ms from 5 of 7 nights");
	});

	it("names the usual range inside the band instead of in a legend", () => {
		const el = draw(model());
		expect(el.querySelector(".ghs-hrvweek-band-label")!.textContent).toBe(en.panelWeekLegendBand);
		expect(el.querySelector(".ghs-hrvweek-legend")).toBeNull();
		expect(draw(model({ band: null })).querySelector(".ghs-hrvweek-band-label")).toBeNull();
	});

	it("adds the change of the 90 day average to the status row, or says it is steady", () => {
		expect(draw(model(), "en", { delta: 3.4, steady: false }).querySelector(".ghs-hrvweek-long")!.textContent).toBe("↑ 3 ms over 90 days");
		expect(draw(model(), "en", { delta: -5, steady: false }).querySelector(".ghs-hrvweek-long")!.textContent).toBe("↓ 5 ms over 90 days");
		expect(draw(model(), "en", { delta: 0.4, steady: true }).querySelector(".ghs-hrvweek-long")!.textContent).toBe(en.panelWeekLongSteady);
		expect(draw(model()).querySelector(".ghs-hrvweek-long")).toBeNull();
	});
});
