// Why it matters: every user-editable setting must have a control in the settings tab. A setting
// added later without one fails here, or is listed below on purpose with the reason.
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, HealthSyncSettingTab } from "../src/settings";
import { METRICS } from "../src/metrics";
import { PANEL_CARDS } from "../src/panel/cards";

/** Settings with no control in the tab, each for a stated reason. */
const NOT_IN_SETTINGS_TAB: Record<string, string> = {
	lastSyncTimes: "internal bookkeeping (date -> last sync time), never user-editable",
	fetchLog: "internal bookkeeping of the backfill (day -> index of the metrics requested), never user-editable",
	backfillJob: "internal bookkeeping of the backfill that is running (the days left), never user-editable",
	panelAuto: "decided once, when the settings were first made: a fresh install lets the panel leave out cards without data, saved settings keep every card; the card switches (panelCards) override it",
	hiddenHabits: "the habits hidden in the Habits card, chosen in the card itself and not in the settings",
	lifestyleHabits: "names and kinds of the habits Garmin has sent, for the panel; bookkeeping, never user-editable",
	fetchSets: "internal bookkeeping of the backfill (the sets of metrics requested), never user-editable",
	garminSession: "legacy cookie session, only cleared on login; not a preference",
	garminOAuth1: "token written by the login flow (moved to secret storage when available)",
	garminOAuth2: "token written by the login flow (moved to secret storage when available)",
	panelOrder: "edited by dragging the cards in the panel (the edit button), never in the settings tab",
	panelCards: "edited through the per-card toggles (keys prefixed 'panel:'), checked separately below",
	enabledMetrics: "edited through the per-metric toggles (keys prefixed 'metric:'), checked separately below",
};

interface AnyItem {
	items?: AnyItem[];
	control?: { key?: string };
}

function collectKeys(items: AnyItem[]): string[] {
	const out: string[] = [];
	for (const item of items) {
		if (item.control?.key) out.push(item.control.key);
		if (item.items) out.push(...collectKeys(item.items));
	}
	return out;
}

function makeTab(): HealthSyncSettingTab {
	const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as typeof DEFAULT_SETTINGS;
	const plugin = { settings, isSessionValid: () => false, todayAvailability: () => "unknown" };
	return new HealthSyncSettingTab({} as never, plugin as never);
}

describe("settings tab covers every setting", () => {
	const keys = collectKeys(makeTab().getSettingDefinitions() as AnyItem[]);

	it("has a control for every setting that is not listed as internal", () => {
		const missing = Object.keys(DEFAULT_SETTINGS).filter(
			(k) => !keys.includes(k) && !(k in NOT_IN_SETTINGS_TAB),
		);
		expect(missing).toEqual([]);
	});

	it("lists no setting as internal that actually has a control, or that does not exist", () => {
		const stale = Object.keys(NOT_IN_SETTINGS_TAB).filter(
			(k) => (keys.includes(k) && k !== "enabledMetrics" && k !== "panelCards") || !(k in DEFAULT_SETTINGS),
		);
		expect(stale).toEqual([]);
	});

	it("has a toggle for every metric", () => {
		const missing = METRICS.filter((m) => !keys.includes(`metric:${m.key}`)).map((m) => m.key);
		expect(missing).toEqual([]);
	});

	it("has a toggle for every panel card", () => {
		const missing = PANEL_CARDS.filter((c) => !keys.includes(`panel:${c.id}`)).map((c) => c.id);
		expect(missing).toEqual([]);
	});

	it("has no control for a key that is not a setting", () => {
		const metricKeys = new Set(METRICS.map((m) => `metric:${m.key}`));
		const cardKeys = new Set(PANEL_CARDS.map((c) => `panel:${c.id}`));
		const unknown = keys.filter((k) => !(k in DEFAULT_SETTINGS) && !metricKeys.has(k) && !cardKeys.has(k));
		expect(unknown).toEqual([]);
	});
});
