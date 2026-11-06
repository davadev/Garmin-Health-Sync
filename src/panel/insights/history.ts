import { RANK_TAIL, historyRank } from "../best-days";
import { MAX_INSIGHTS, type Insight } from "./registry";
import type { Signals } from "./signals";

/**
 * The interpretations of a card, and a line more when the shown day is at either end of all the days the person has:
 * the best tenth or the weakest tenth. Added only while the card has room, after the explanations of the day.
 */
export function withHistory(s: Signals, key: string, insights: Insight[]): Insight[] {
	if (insights.length >= MAX_INSIGHTS) return insights;
	const rank = historyRank(s.index, s.date, key);
	if (!rank) return insights;
	const params = { pct: String(Math.round(rank.share * 100)), n: String(rank.n), since: rank.since.slice(0, 7) };
	if (rank.share >= 1 - RANK_TAIL) return [...insights, { id: "history_top", params }];
	if (rank.share <= RANK_TAIL) return [...insights, { id: "history_bottom", params }];
	return insights;
}
