import { setIcon } from "obsidian";
import { t } from "../../i18n/t";
import { INSIGHTS, insightText, type Insight } from "../insights/registry";
import { renderTrend, type TrendView } from "../trend";

/** What the light bulb says about one part of a card (a habit), folded under its name until it is opened. */
export interface InsightGroup {
	title: string;
	insights: Insight[];
	facts: string[];
}

export interface CardShell {
	title: string;
	/** Headline value of the day; null means "No reading" and makes the card dashed; undefined shows no headline. */
	value: string | null | undefined;
	/** Small muted text after the value ("ms", "· 78"). */
	unit?: string;
	/** The unit text is a figure of its own (the sleep score), set as bold as the value instead of muted. */
	unitStrong?: boolean;
	/** The unit is a capital letter that must stay one (litres), where the others are set in lower case. */
	unitKeepCase?: boolean;
	explain: string;
	/** The card's own numbers that are too much for the card, listed in the same box after the interpretation. */
	facts?: string[];
	/** The line that explains the diamond of the personal best, drawn with the diamond's colour on its edge. */
	bestFact?: string;
	explainOpen: boolean;
	onToggleExplain: () => void;
	lang: string;
	/** Small trend line at the bottom of the card. */
	trend?: TrendView;
	/** Interpretations and numbers grouped under folded headings, after the flat ones. */
	groups?: InsightGroup[];
	/** What the data suggests (why a value is off and what helps, or why it is good), shown under the light bulb before the general explanation. */
	insights: Insight[];
}

/** The frame every card shares: title, headline value, light bulb button, the details and, when open, the explanation. */
export function renderCard(parent: HTMLElement, shell: CardShell, details: (card: HTMLElement) => void): void {
	const card = parent.createDiv({ cls: "ghs-card" });
	const head = card.createDiv({ cls: "ghs-card-head" });
	head.createSpan({ cls: "ghs-card-title", text: shell.title });
	if (shell.value === null) card.addClass("ghs-card-empty");
	if (shell.value !== undefined) {
		const value = head.createSpan({ cls: "ghs-card-value", text: shell.value ?? t("panelNoReading", shell.lang) });
		if (shell.value !== null && shell.unit) value.createSpan({ cls: `ghs-unit${shell.unitStrong ? " ghs-unit-strong" : ""}${shell.unitKeepCase ? " ghs-unit-case" : ""}`, text: ` ${shell.unit}` });
	} else {
		head.createSpan({ cls: "ghs-card-value" });
	}
	const info = head.createEl("button", { cls: "clickable-icon ghs-info", attr: { "aria-label": t("panelInfo", shell.lang), "aria-expanded": String(shell.explainOpen) } });
	setIcon(info, "lightbulb");
	info.addEventListener("click", shell.onToggleExplain);
	details(card);
	if (shell.trend) renderTrend(card, shell.trend, shell.lang);
	if (shell.explainOpen) {
		const facts = shell.facts ?? [];
		const best = shell.bestFact === undefined ? [] : [shell.bestFact];
		const groups = shell.groups ?? [];
		if (shell.insights.length > 0 || facts.length > 0 || best.length > 0 || groups.length > 0) {
			const box = card.createDiv({ cls: "ghs-insight" });
			box.createDiv({ cls: "ghs-insight-title", text: t("panelInsightTitle", shell.lang) });
			for (const insight of shell.insights) box.createDiv({ cls: `ghs-insight-item ghs-insight-${INSIGHTS[insight.id].kind}`, text: insightText(insight, shell.lang) });
			for (const fact of facts) box.createDiv({ cls: "ghs-insight-item ghs-fact", text: fact });
			for (const fact of best) box.createDiv({ cls: "ghs-insight-item ghs-fact ghs-fact-best", text: fact });
			for (const group of groups) {
				const details = box.createEl("details", { cls: "ghs-insight-group" });
				const watch = group.insights.some((i) => INSIGHTS[i.id].kind === "watch");
				const good = group.insights.some((i) => INSIGHTS[i.id].kind === "good");
				details.createEl("summary", { cls: `ghs-insight-group-title${watch ? " ghs-insight-group-watch" : good ? " ghs-insight-group-good" : ""}`, text: group.title });
				for (const insight of group.insights) details.createDiv({ cls: `ghs-insight-item ghs-insight-${INSIGHTS[insight.id].kind}`, text: insightText(insight, shell.lang) });
				for (const fact of group.facts) details.createDiv({ cls: "ghs-insight-item ghs-fact", text: fact });
			}
		}
		// what the card shows and how it is worked out, with the disclaimer, folded until asked for
		const about = card.createEl("details", { cls: "ghs-about" });
		about.createEl("summary", { cls: "ghs-insight-title", text: t("panelAboutTitle", shell.lang) });
		about.createDiv({ cls: "ghs-explain", text: shell.explain });
		about.createDiv({ cls: "ghs-insight-note", text: t("panelInsightNote", shell.lang) });
	}
}
