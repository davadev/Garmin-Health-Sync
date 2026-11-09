// Why it matters: the settings tab is where the user turns metrics on and off, changes language and units,
// and signs in or out. A toggle that does not persist, a label in the wrong language or a login row that
// stacks buttons on every refresh are all visible bugs.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App, Notice, Setting } from "../testUtils/mocks/obsidian";
import { DEFAULT_SETTINGS, HealthSyncSettingTab, type HealthSyncSettings } from "../src/settings";
import { METRICS } from "../src/metrics";
import { PANEL_CARDS } from "../src/panel/cards";
import { en } from "../src/i18n/en";
import { de } from "../src/i18n/de";

interface Item {
	type?: string;
	name?: string;
	desc?: string;
	heading?: string;
	items?: Item[];
	control?: { type: string; key: string; options?: Record<string, string>; rows?: number };
	render?: (setting: Setting) => unknown;
	action?: (el: HTMLElement) => void;
}

function make(patch: Partial<HealthSyncSettings> = {}, session = false, today: "full" | "reduced" | "garmin" | "unknown" | "none" = "unknown") {
	const settings: HealthSyncSettings = { ...DEFAULT_SETTINGS, enabledMetrics: { ...DEFAULT_SETTINGS.enabledMetrics }, lastSyncTimes: {}, language: "en", ...patch };
	const plugin = {
		settings,
		isSessionValid: () => session,
		saveSettings: vi.fn().mockResolvedValue(undefined),
		applyServerRegion: vi.fn(),
		applyPanelEnabled: vi.fn().mockResolvedValue(undefined),
		refreshPanels: vi.fn(),
		todayAvailability: () => today,
		noteProperties: { modeChanged: vi.fn() },
		logout: vi.fn().mockResolvedValue(undefined),
		loginViaBrowser: vi.fn().mockImplementation((done?: () => void) => {
			done?.();
			return Promise.resolve();
		}),
		openManualLogin: vi.fn(),
		getSyncDiagnostics: vi.fn().mockReturnValue("the diagnostics"),
	};
	const tab = new HealthSyncSettingTab(new App() as never, plugin as never);
	return { tab, plugin, defs: () => tab.getSettingDefinitions() as unknown as Item[] };
}
const flat = (items: Item[]): Item[] => items.flatMap((i) => [i, ...(i.items ? flat(i.items) : [])]);
const named = (items: Item[], name: string): Item => flat(items).find((i) => i.name === name)!;
const keyed = (items: Item[], key: string): Item => flat(items).find((i) => i.control?.key === key)!;

beforeEach(() => {
	document.body.innerHTML = "";
});

describe("the settings layout", () => {
	it("lists the controls in order with their kinds", () => {
		const controls = flat(make().defs())
			.filter((i) => i.control && !i.control.key.startsWith("metric:") && !i.control.key.startsWith("panel:"))
			.map((i) => [i.control!.key, i.control!.type]);
		expect(controls).toEqual([
			["language", "dropdown"],
			["serverRegion", "dropdown"],
			["unitSystem", "dropdown"],
			["panelEnabled", "toggle"],
			["birthYear", "text"],
			["autoSync", "toggle"],
			["missingNoteBehaviour", "dropdown"],
			["dailyNotePath", "text"],
			["dailyNoteFormat", "text"],
			["dailyNoteTemplate", "textarea"],
			["usePrefix", "toggle"],
			["writeWorkoutLocation", "toggle"],
			["writeTrainings", "toggle"],
			["propertiesMode", "dropdown"],
		]);
	});

	it("offers the six languages and the two regions and unit systems", () => {
		const defs = make().defs();
		expect(Object.keys(keyed(defs, "language").control!.options!)).toEqual(["en", "de", "zh", "ja", "es", "fr"]);
		expect(keyed(defs, "serverRegion").control!.options).toEqual({ international: en.regionInternational, china: en.regionChina });
		expect(keyed(defs, "unitSystem").control!.options).toEqual({ metric: en.unitMetric, imperial: en.unitImperial });
		expect(keyed(defs, "propertiesMode").control!.options).toEqual({ off: en.propertiesOff, fold: en.propertiesFold, hide: en.propertiesHide, foldHide: en.propertiesFoldHide });
		expect(keyed(defs, "missingNoteBehaviour").control!.options).toEqual({ create: en.missingNoteCreate, history: en.missingNoteHistory, skip: en.missingNoteSkip });
	});

	it("shows standard metrics in a group and extended ones on their own page", () => {
		const defs = make().defs();
		const group = defs.find((i) => i.type === "group")!;
		expect(group.heading).toBe(en.settingsMetricsStandard);
		expect(group.items!.map((i) => i.control!.key)).toEqual(METRICS.filter((m) => m.category === "standard").map((m) => `metric:${m.key}`));
		const page = defs.find((i) => i.type === "page" && i.name === en.settingsMetricsExtendedDesc)!;
		expect(page.items![0]!.items!.map((i) => i.control!.key)).toEqual(METRICS.filter((m) => m.category === "extended").map((m) => `metric:${m.key}`));
	});

	it("puts the side panel switch on its own page", () => {
		const page = make().defs().find((i) => i.name === en.settingsPanel)!;
		expect(page.type).toBe("page");
		expect(page.items![0]!.control!.key).toBe("panelEnabled");
	});

	it("lists one switch per panel card after the panel switch, each in the user's language", () => {
		const page = make().defs().find((i) => i.name === en.settingsPanel)!;
		expect(page.items!.map((i) => i.control!.key)).toEqual(["panelEnabled", "birthYear", ...PANEL_CARDS.map((c) => `panel:${c.id}`)]);
		const german = make({ language: "de" }).defs().find((i) => i.name === de.settingsPanel)!;
		expect(german.items!.slice(2).map((i) => i.name)).toEqual(PANEL_CARDS.map((c) => de[c.title]));
	});

	describe("what each panel card needs", () => {
		const descs = (patch: Partial<HealthSyncSettings> = {}): ((id: string) => string | undefined) => {
			const page = make(patch).defs().find((i) => i.name === (patch.language === "de" ? de.settingsPanel : en.settingsPanel))!;
			return (id) => (page.items!.find((i) => i.control?.key === `panel:${id}`) as { desc?: string }).desc;
		};

		it("describes what every card needs and when it unlocks, in the user's language", () => {
			expect(descs()("hrv")).toBe(`${en.panelNeedsHrv} ${en.panelCardAlsoUseful.replace("{metrics}", en.metric_hydration_ml)}`);
			expect(descs({ language: "de" })("hrv")).toBe(`${de.panelNeedsHrv} ${de.panelCardAlsoUseful.replace("{metrics}", de.metric_hydration_ml)}`);
			for (const c of PANEL_CARDS) expect(descs()(c.id)!.startsWith(en[c.needs])).toBe(true);
		});

		it("lists the required metrics that are off, by name", () => {
			expect(descs()("spo2")).toBe(`${en.panelNeedsSpo2} ${en.panelCardTurnOn.replace("{metrics}", en.metric_spo2)}`);
			// all four stages are off by default
			expect(descs()("stages")).toBe(`${en.panelNeedsStages} ${en.panelCardTurnOn.replace("{metrics}", "Deep sleep, REM sleep, Light sleep, Awake time")}`);
			const some = descs({ enabledMetrics: { ...DEFAULT_SETTINGS.enabledMetrics, sleep_rem: true, sleep_deep: true } })("stages");
			expect(some).toBe(`${en.panelNeedsStages} ${en.panelCardTurnOn.replace("{metrics}", "Light sleep, Awake time")}`);
			const all = descs({ enabledMetrics: { ...DEFAULT_SETTINGS.enabledMetrics, sleep_rem: true, sleep_deep: true, sleep_light: true, sleep_awake: true } })("stages");
			expect(all).toBe(en.panelNeedsStages);
		});

		it("lists the metrics that only add detail, separately", () => {
			// sleep duration and score are on by default; bedtime and wake-up time are not
			expect(descs()("sleep")).toBe(`${en.panelNeedsSleep} ${en.panelCardAlsoUseful.replace("{metrics}", "Bedtime, Wake-up time")}`);
			expect(descs()("steps")).toBe(`${en.panelNeedsSteps} ${en.panelCardAlsoUseful.replace("{metrics}", "Distance (km), Active calories, Total calories")}`);
			const on = { ...DEFAULT_SETTINGS.enabledMetrics, distance_km: true, calories_active: true, calories_total: true };
			expect(descs({ enabledMetrics: on })("steps")).toBe(en.panelNeedsSteps);
		});

		it("names distance in miles for imperial users", () => {
			expect(descs({ unitSystem: "imperial" })("steps")).toContain("Distance (mi)");
		});

		it("says both when a required and an optional metric are off", () => {
			expect(descs()("battery")).toBe(`${en.panelNeedsBattery} ${en.panelCardTurnOn.replace("{metrics}", "Body battery (highest)")} ${en.panelCardAlsoUseful.replace("{metrics}", "Body battery (lowest), Body battery")}`);
		});

		it("adds nothing for the cards that need only the activities", () => {
			for (const id of ["load", "weekly", "sessions"]) expect(descs()(id)!.includes(en.panelCardTurnOn.split("{")[0]!)).toBe(false);
			expect(descs()("weekly")).toBe(en.panelNeedsWeekly);
			// the load card only has the training status as a detail
			expect(descs()("load")).toBe(`${en.panelNeedsLoad} ${en.panelCardAlsoUseful.replace("{metrics}", "Training status")}`);
		});

		it("falls back to the default of a metric missing from the record", () => {
			expect(descs({ enabledMetrics: {} })("hrv")).toContain(en.panelNeedsHrv);
			expect(descs({ enabledMetrics: {} })("spo2")).toContain(en.panelCardTurnOn.split("{")[0]!);
		});
	});

	describe("the Readiness switch", () => {
		const today = (m: ReturnType<typeof make>): { desc?: string; control?: { disabled?: () => boolean } } => keyed(m.defs(), "panel:today") as never;

		it("can be switched on while the data can still give something, also while it is too early to tell", () => {
			for (const state of ["full", "reduced", "garmin", "unknown"] as const) {
				const m = make({}, false, state);
				expect(today(m).control!.disabled!()).toBe(false);
				expect(m.tab.getControlValue("panel:today")).toBe(true);
				expect(today(m).desc).not.toContain(en.panelTodayUnavailable);
			}
		});

		it("cannot be switched on when the data has nothing it can use, and says why; it shows as off", () => {
			const m = make({}, false, "none");
			expect(today(m).control!.disabled!()).toBe(true);
			expect(m.tab.getControlValue("panel:today")).toBe(false);
			expect(today(m).desc).toContain(en.panelTodayUnavailable);
		});

		it("can still be switched off when the user had switched it on, and keeps showing as on", () => {
			const m = make({ panelCards: { today: true } }, false, "none");
			expect(m.tab.getControlValue("panel:today")).toBe(true);
			expect(today(m).control!.disabled!()).toBe(false);
		});
	});

	it("reads and writes a card switch, defaulting to on, and refreshes the panels", async () => {
		const { tab, plugin } = make();
		expect(tab.getControlValue("panel:hrv")).toBe(true);
		await tab.setControlValue("panel:hrv", false);
		expect(plugin.settings.panelCards).toEqual({ hrv: false });
		expect(tab.getControlValue("panel:hrv")).toBe(false);
		expect(plugin.saveSettings).toHaveBeenCalledOnce();
		expect(plugin.refreshPanels).toHaveBeenCalledOnce();
		expect(plugin.noteProperties.modeChanged).not.toHaveBeenCalled(); // every Garmin property is hidden, whatever cards are on
	});

	it("restarts the handling of the properties when their setting changes", async () => {
		const { tab, plugin } = make();
		await tab.setControlValue("propertiesMode", "hide");
		expect(plugin.settings.propertiesMode).toBe("hide");
		expect(plugin.noteProperties.modeChanged).toHaveBeenCalledOnce();
	});

	it("shows the birth year as text and stores only a believable year, otherwise nothing", async () => {
		const { tab, plugin } = make();
		expect(tab.getControlValue("birthYear")).toBe("");
		await tab.setControlValue("birthYear", "1985");
		expect(plugin.settings.birthYear).toBe(1985);
		expect(tab.getControlValue("birthYear")).toBe("1985");
		expect(plugin.refreshPanels).toHaveBeenCalledTimes(1);
		await tab.setControlValue("birthYear", "19");
		expect(plugin.settings.birthYear).toBeNull();
		await tab.setControlValue("birthYear", "1985");
		await tab.setControlValue("birthYear", "");
		expect(plugin.settings.birthYear).toBeNull();
		expect(plugin.saveSettings).toHaveBeenCalledTimes(4);
	});

	it("tells the estimated maximum heart rate once a birth year is set, and rebuilds the screen", async () => {
		const desc = (t: ReturnType<typeof make>): string | undefined => (flat(t.defs()).find((i) => i.control?.key === "birthYear") as { desc?: string }).desc;
		const without = make();
		expect(desc(without)).toBe(en.settingsBirthYearDesc);
		const year = new Date().getFullYear() - 40;
		const withYear = make({ birthYear: year });
		expect(desc(withYear)).toBe(`${en.settingsBirthYearDesc} Estimated maximum heart rate: 180 bpm.`);
		await without.tab.setControlValue("birthYear", String(year));
		expect((without.tab as unknown as { updates: number }).updates).toBe(1);
	});

	it("rebuilds the screen after a metric toggle so the card hints follow", async () => {
		const { tab } = make();
		await tab.setControlValue("metric:spo2", true);
		expect((tab as unknown as { updates: number }).updates).toBe(1);
	});

	it("labels every metric in the user's language", () => {
		const german = flat(make({ language: "de" }).defs());
		expect(named(german, de.metric_steps)).toBeDefined();
		expect(named(german, de.settingsAutoSync)).toBeDefined();
	});

	it("uses the miles and pounds labels for imperial users", () => {
		const defs = make({ unitSystem: "imperial" }).defs();
		expect(keyed(defs, "metric:distance_km").name).toBe(en.metric_distance_mi);
		expect(keyed(defs, "metric:weight_kg").name).toBe(en.metric_weight_lbs);
		expect(keyed(make().defs(), "metric:distance_km").name).toBe(en.metric_distance_km);
	});

	it("describes the connection state, with the logout hint only when signed in", () => {
		const out = named(make().defs(), en.settingsGarminLogin);
		expect(out.desc).toContain(en.settingsGarminLoggedOut);
		expect(out.desc).not.toContain(en.settingsGarminLogoutHint);
		const inn = named(make({}, true).defs(), en.settingsGarminLogin);
		expect(inn.desc).toContain(en.settingsGarminLoggedIn);
		expect(inn.desc).toContain(en.settingsGarminLogoutHint);
	});

	it("offers the diagnostics action", () => {
		expect(named(make().defs(), en.modalCredCopyDiagnostics).action).toBeTypeOf("function");
	});
});

describe("reading and writing values", () => {
	it("reads plain settings from the settings object", () => {
		const { tab } = make({ dailyNoteFormat: "DD.MM.YYYY" });
		expect(tab.getControlValue("dailyNoteFormat")).toBe("DD.MM.YYYY");
		expect(tab.getControlValue("autoSync")).toBe(true);
	});

	it("reads a metric toggle: the saved value, else the metric's default, else off", () => {
		const { tab, plugin } = make();
		plugin.settings.enabledMetrics["steps"] = false;
		expect(tab.getControlValue("metric:steps")).toBe(false);
		delete plugin.settings.enabledMetrics["hrv"];
		expect(tab.getControlValue("metric:hrv")).toBe(true);
		delete plugin.settings.enabledMetrics["spo2"];
		expect(tab.getControlValue("metric:spo2")).toBe(false);
		expect(tab.getControlValue("metric:nonexistent")).toBe(false);
	});

	it("writes a metric toggle into the enabledMetrics record and saves", async () => {
		const { tab, plugin } = make();
		await tab.setControlValue("metric:spo2", true);
		expect(plugin.settings.enabledMetrics["spo2"]).toBe(true);
		await tab.setControlValue("metric:spo2", 0);
		expect(plugin.settings.enabledMetrics["spo2"]).toBe(false);
		expect(plugin.saveSettings).toHaveBeenCalledTimes(2);
	});

	it("writes plain settings and saves without refreshing for ordinary keys", async () => {
		const { tab, plugin } = make();
		await tab.setControlValue("autoSync", false);
		expect(plugin.settings.autoSync).toBe(false);
		expect(plugin.saveSettings).toHaveBeenCalledOnce();
		expect((tab as unknown as { updates: number }).updates).toBe(0);
		expect(plugin.refreshPanels).not.toHaveBeenCalled();
		expect(plugin.applyServerRegion).not.toHaveBeenCalled();
	});

	it.each(["dailyNotePath", "dailyNoteFormat"])("redraws the panel when %s changes, because it decides which notes are daily notes", async (key) => {
		const { tab, plugin } = make();
		await tab.setControlValue(key, "Journal");
		expect(plugin.refreshPanels).toHaveBeenCalledOnce();
	});

	it("applies a changed server region to the provider", async () => {
		const { tab, plugin } = make();
		await tab.setControlValue("serverRegion", "china");
		expect(plugin.settings.serverRegion).toBe("china");
		expect(plugin.applyServerRegion).toHaveBeenCalledOnce();
	});

	it.each(["language", "unitSystem"])("rebuilds the screen after %s changes", async (key) => {
		const { tab } = make();
		await tab.setControlValue(key, key === "language" ? "de" : "imperial");
		expect((tab as unknown as { updates: number }).updates).toBe(1);
	});

	it("re-renders open panels after a language change", async () => {
		const { tab, plugin } = make();
		await tab.setControlValue("language", "de");
		expect(plugin.refreshPanels).toHaveBeenCalledOnce();
	});

	it("opens or closes the panel when its switch changes", async () => {
		const { tab, plugin } = make();
		await tab.setControlValue("panelEnabled", true);
		expect(plugin.settings.panelEnabled).toBe(true);
		expect(plugin.applyPanelEnabled).toHaveBeenCalledOnce();
	});
});

describe("the sign-in row", () => {
	function row(session: boolean) {
		const m = make({}, session);
		const container = document.createElement("div");
		const setting = new Setting(container);
		const item = named(m.defs(), en.settingsGarminLogin);
		const cleanup = item.render!(setting) as () => void;
		return { ...m, setting, cleanup, buttons: setting.buttons };
	}

	it("signed out: a primary login button and the manual fallback with its tooltip", () => {
		const { buttons, setting } = row(false);
		expect(buttons.map((b) => b.buttonEl.textContent)).toEqual([en.settingsGarminLogin, en.settingsGarminManualLogin]);
		expect(buttons[0]!.buttonEl.classList.contains("mod-cta")).toBe(true);
		expect(buttons[1]!.tooltip).toBe(en.settingsGarminManualLoginTooltip);
		expect(setting.settingEl.classList.contains("ghs-login-row")).toBe(true);
	});

	it("signed in: a single logout button", () => {
		const { buttons } = row(true);
		expect(buttons.map((b) => b.buttonEl.textContent)).toEqual([en.settingsGarminLogout]);
	});

	it("logging in starts the browser-free sign-in and refreshes the screen when done", async () => {
		const { buttons, plugin, tab } = row(false);
		buttons[0]!.buttonEl.click();
		await vi.waitFor(() => expect(plugin.loginViaBrowser).toHaveBeenCalledOnce());
		expect((tab as unknown as { updates: number }).updates).toBe(2);
	});

	it("the manual button opens the ticket dialog and refreshes afterwards", () => {
		const { buttons, plugin, tab } = row(false);
		buttons[1]!.buttonEl.click();
		expect(plugin.openManualLogin).toHaveBeenCalledOnce();
		(plugin.openManualLogin.mock.calls[0]![0] as () => void)();
		expect((tab as unknown as { updates: number }).updates).toBe(1);
	});

	it("logging out clears the session and refreshes", async () => {
		const { buttons, plugin, tab } = row(true);
		buttons[0]!.buttonEl.click();
		await vi.waitFor(() => expect(plugin.logout).toHaveBeenCalledOnce());
		await vi.waitFor(() => expect((tab as unknown as { updates: number }).updates).toBe(1));
	});

	it("the cleanup removes the buttons and the class, so a re-render does not stack them", () => {
		const { cleanup, setting } = row(false);
		cleanup();
		expect(setting.controlEl.querySelectorAll("button")).toHaveLength(0);
		expect(setting.settingEl.classList.contains("ghs-login-row")).toBe(false);
	});
});

describe("copying the diagnostics", () => {
	function run() {
		const m = make();
		const el = document.createElement("div");
		named(m.defs(), en.modalCredCopyDiagnostics).action!(el);
		return { ...m, el };
	}

	it("copies the sync log and confirms with a notice", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
		run();
		await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("the diagnostics"));
		await vi.waitFor(() => expect(Notice.recorded.map((n) => n.message)).toEqual([en.modalCredDiagnosticsCopied]));
	});

	it("shows the text in a selectable field when the clipboard is blocked", async () => {
		Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) }, configurable: true });
		const { el } = run();
		await vi.waitFor(() => expect(el.querySelector("textarea")).not.toBeNull());
		const area = el.querySelector("textarea")!;
		expect(area.value || area.textContent).toBe("the diagnostics");
		expect(area.readOnly).toBe(true);
		expect(Number(area.rows)).toBe(6);
		expect(area.classList.contains("ghs-diagnostics")).toBe(true);
		expect(Notice.recorded).toEqual([]);
	});
});

describe("the stress and recovery duration switches (issue 31)", () => {
	it("are extended metrics, off by default, with a toggle and a label in every language", async () => {
		for (const key of ["stress_high", "recovery_high"]) {
			const metric = METRICS.find((m) => m.key === key)!;
			expect(metric.category).toBe("extended");
			expect(metric.defaultEnabled).toBe(false);
			expect(flat(make().defs()).map((i) => i.control?.key)).toContain(`metric:${key}`);
		}
		const { es } = await import("../src/i18n/es");
		const { fr } = await import("../src/i18n/fr");
		const { ja } = await import("../src/i18n/ja");
		const { zh } = await import("../src/i18n/zh");
		for (const table of [en, de, es, fr, ja, zh]) {
			expect(Object.keys(table)).toContain("metric_stress_high");
			expect(Object.keys(table)).toContain("metric_recovery_high");
		}
	});
});
