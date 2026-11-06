import { t } from "../../i18n/t";
import { shiftDate } from "../../dates";
import { formatNumber } from "../format";
import type { DayIndex } from "../index";
import { average } from "../stats";
import { computeTrend, type Trend } from "../trend";
import { longFacts, longView, type LongView } from "../longview";
import { renderCard } from "./shell";
import type { Insight } from "../insights/registry";

export const FLOORS_MIN_DAYS = 5;
const WINDOW_DAYS = 7;
const ZONE_FACTOR = 1.1;
const MIN_BLOCKS = 14;

export interface FloorsModel {
	/** What the data suggests, filled in by the panel (see insights/). */
	insights: Insight[];
	trend: Trend | null;
	floors: number | null;
	/** Days with floors among the 7 before the shown day. */
	have: number;
	/** Whole floors of the zone: the 7-day average up to 10 % above it. */
	zone: { low: number; high: number } | null;
	long: LongView | null;
}

export function computeFloors(index: DayIndex, date: string): FloorsModel {
	const avg = average(index, "floors", date, WINDOW_DAYS, FLOORS_MIN_DAYS);
	let have = 0;
	for (let i = 1; i <= WINDOW_DAYS; i++) {
		if (index.value("floors", shiftDate(date, -i)) !== null) have++;
	}
	return { insights: [], trend: computeTrend((d) => index.value("floors", d), date), floors: index.value("floors", date), have, long: longView((d) => index.value("floors", d), date), zone: avg === null || avg <= 0 ? null : { low: Math.round(avg), high: Math.max(Math.round(avg), Math.round(avg * ZONE_FACTOR)) } };
}

export function renderFloors(parent: HTMLElement, model: FloorsModel, lang: string, explainOpen: boolean, onToggleExplain: () => void): void {
	const value = model.floors === null ? null : formatNumber(model.floors, lang, 0);
	renderCard(parent, { title: t("panelFloorsTitle", lang), value, explain: t("panelFloorsExplain", lang), explainOpen, onToggleExplain, lang, insights: model.insights, facts: longFacts(model.long, (n) => formatNumber(n, lang, 0), lang), trend: { trend: model.trend, format: (n) => formatNumber(n, lang, 1) } }, (card) => {
		const { zone, floors } = model;
		if (!zone) {
			card.createDiv({ cls: "ghs-card-note", text: t("panelLocked", lang).replace("{need}", String(FLOORS_MIN_DAYS)).replace("{have}", String(model.have)) });
			return;
		}
		if (floors === null) return;
		const blocks = Math.max(MIN_BLOCKS, floors, zone.high);
		const row = card.createDiv({ cls: "ghs-blocks", attr: { role: "img", "aria-label": `${floors}` } });
		for (let i = 1; i <= blocks; i++) {
			const cls = i <= floors ? "ghs-block-filled" : i <= zone.high ? "ghs-block-zone" : "";
			row.createDiv({ cls: `ghs-block ${cls}`.trim() });
		}
		const foot = card.createDiv({ cls: "ghs-foot" });
		foot.createSpan({ cls: "ghs-foot-label", text: t("panelToYourZone", lang) });
		const toLow = Math.max(1, zone.low - floors);
		const toHigh = zone.high - floors;
		const range = toLow >= toHigh ? String(toHigh) : `${toLow}–${toHigh}`;
		foot.createSpan({
			cls: `ghs-foot-value${toHigh <= 0 ? " ghs-foot-good" : ""}`,
			text: toHigh <= 0 ? t("panelZoneDone", lang) : t("panelFloorsToGo", lang).replace("{range}", range),
		});
	});
}
