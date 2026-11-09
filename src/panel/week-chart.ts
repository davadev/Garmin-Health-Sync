import { shiftDate } from "../dates";
import { t } from "../i18n/t";
import { formatNumber, weekdayInitial } from "./format";
import { WEEK_NIGHTS, WEEK_WINDOW, type WeekModel } from "./week";

const SVG_NS = "http://www.w3.org/2000/svg";
/** The bars start a little below the lowest value, so a 5 ms difference shows; a bar from zero would hide it. */
const FLOOR_SHARE = 0.15;

/** How the average of the last 90 days moved against the 90 days before: `steady` when it stayed within the usual night-to-night swing. */
export interface LongChange {
	delta: number;
	steady: boolean;
}

/** Where the 7-night average of the shown night lies against the usual range of a week. */
function standing(week: WeekModel): "panelWeekBelow" | "panelWeekAbove" | "panelWeekIn" | null {
	if (week.band === null || week.average === null) return null;
	return week.average < week.band.low ? "panelWeekBelow" : week.average > week.band.high ? "panelWeekAbove" : "panelWeekIn";
}

/**
 * The last 14 nights as bars (the shown night is the solid one), the 7-night average as a line, the usual range of a
 * week as a band behind them and runs of nights without the watch as dashed boxes. The last night stays a bar of its
 * own: the average never replaces it.
 */
export function renderWeek(parent: HTMLElement, week: WeekModel, date: string, lang: string, long: LongChange | null = null): void {
	const values = [...week.nights, ...week.avg].filter((v): v is number => v !== null);
	if (week.band) values.push(week.band.low, week.band.high);
	const wrap = parent.createDiv({ cls: "ghs-hrvweek" });
	const last = week.nights[week.nights.length - 1] ?? null;
	const where = standing(week);
	// the nights it rests on are named only when the week is not complete
	const status = week.average === null ? t("panelWeekNotEnough", lang) : t(week.coverage < WEEK_WINDOW ? "panelWeekStatusPartial" : "panelWeekStatus", lang).replace("{avg}", formatNumber(week.average, lang, 0)).replace("{n}", String(week.coverage));
	wrap.setAttr("role", "img");
	wrap.setAttr("aria-label", [last === null ? "" : t("panelWeekLast", lang).replace("{value}", formatNumber(last, lang, 0)), status, where === null ? "" : t(where, lang)].filter(Boolean).join(" · "));
	if (values.length === 0) return;

	const hi = Math.max(...values);
	const lo = Math.min(...values);
	const floor = lo - (hi - lo || hi * 0.1) * FLOOR_SHARE;
	const y = (v: number): number => ((v - floor) / (hi - floor)) * 100;

	const chart = wrap.createDiv({ cls: "ghs-hrvweek-chart" });
	if (week.band) {
		const band = chart.createDiv({ cls: "ghs-hrvweek-band" });
		band.setCssProps({ "--ghs-y": `${y(week.band.low)}%`, "--ghs-h": `${y(week.band.high) - y(week.band.low)}%` });
		// named in the band itself, so the chart needs no legend
		band.createSpan({ cls: "ghs-hrvweek-band-label", text: t("panelWeekLegendBand", lang) });
	}
	for (const gap of week.gaps) {
		const box = chart.createDiv({ cls: "ghs-hrvweek-gap", attr: { title: t("panelWeekGap", lang).replace("{n}", String(gap.length)) } });
		box.setCssProps({ "--ghs-x": `${(gap.from / WEEK_NIGHTS) * 100}%`, "--ghs-w": `${(gap.length / WEEK_NIGHTS) * 100}%` });
	}
	const bars = chart.createDiv({ cls: "ghs-hrvweek-bars" });
	week.nights.forEach((v, i) => {
		const col = bars.createDiv({ cls: "ghs-night" });
		const bar = col.createDiv({ cls: `ghs-night-bar${i === week.nights.length - 1 ? " ghs-night-bar-last" : ""}${v === null ? " ghs-night-bar-missing" : ""}` });
		if (v !== null) bar.setCssProps({ "--ghs-h": `${y(v)}%` });
		col.createSpan({ cls: "ghs-night-day", text: weekdayInitial(shiftDate(date, i - (WEEK_NIGHTS - 1)), lang) });
	});

	// one line per run of nights with an average: a gap breaks the line instead of being bridged
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("class", "ghs-hrvweek-line");
	svg.setAttribute("viewBox", `0 0 ${WEEK_NIGHTS} 100`);
	svg.setAttribute("preserveAspectRatio", "none");
	svg.setAttribute("aria-hidden", "true");
	chart.appendChild(svg);
	let run: string[] = [];
	const flush = (): void => {
		if (run.length > 1) {
			const line = document.createElementNS(SVG_NS, "polyline");
			line.setAttribute("points", run.join(" "));
			svg.appendChild(line);
		}
		run = [];
	};
	week.avg.forEach((v, i) => {
		if (v === null) flush();
		else run.push(`${i + 0.5},${100 - y(v)}`);
	});
	flush();

	const line = wrap.createDiv({ cls: "ghs-hrvweek-status" });
	line.createSpan({ cls: where === "panelWeekBelow" ? "ghs-hrvweek-below" : undefined, text: where === null ? status : `${status} · ${t(where, lang)}` });
	if (long) {
		const text = long.steady ? t("panelWeekLongSteady", lang) : t("panelWeekLong", lang).replace("{arrow}", long.delta > 0 ? "↑" : "↓").replace("{delta}", formatNumber(Math.abs(long.delta), lang, 0));
		line.createSpan({ cls: "ghs-hrvweek-long", text });
	}
}
