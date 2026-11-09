// Why it matters: main.ts is the plugin's brain: what runs at startup, which days auto-sync fetches and
// how often (Garmin rate-limits), what happens to the sign-in tokens, and which note a manual sync writes
// into. Each rule below is something a user would notice as a missed day, a request storm or a logout.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App, Modal, Notice, Platform, Setting, TFile } from "../testUtils/mocks/obsidian";
import { FakeGarminProvider } from "../testUtils/fakeGarminProvider";
import HealthSyncPlugin from "../src/main";
import { DEFAULT_SETTINGS, type HealthSyncSettings } from "../src/settings";
import { LoginRequiredError } from "../src/errors";
import { en } from "../src/i18n/en";
import { de } from "../src/i18n/de";

vi.mock("../src/providers/garmin/garmin-provider", async () => {
	const m = await import("../testUtils/fakeGarminProvider");
	return { GarminProvider: m.FakeGarminProvider };
});

const NOW = new Date(2026, 9, 25, 10, 0, 0); // 2026-10-25 10:00 local, a Sunday
const MIN = 60_000;
const HOUR = 60 * MIN;
const TOKEN1 = { oauth_token: "OT", oauth_token_secret: "OS" };
const TOKEN2 = { access_token: "at", refresh_token: "rt", expires_in: 3600, expires_at: 99 };

interface Loaded {
	app: App;
	plugin: HealthSyncPlugin & { data: unknown; commands: Map<string, { name: string; callback?: () => void; checkCallback?: (checking: boolean) => boolean | void }>; settingTabs: unknown[]; saves: number; statusBarItems: HTMLElement[] };
	provider: FakeGarminProvider;
}

/** Create the plugin with the given data.json and run onload. */
async function load(data: Partial<HealthSyncSettings> | null = null, setup: (app: App) => void = () => undefined, version = "0.11.1-test"): Promise<Loaded> {
	const app = new App();
	setup(app);
	const plugin = new HealthSyncPlugin(app as never, { version } as never) as Loaded["plugin"];
	plugin.data = data;
	await plugin.onload();
	return { app, plugin, provider: FakeGarminProvider.last() };
}
const settle = async (): Promise<void> => {
	await vi.advanceTimersByTimeAsync(0);
	await vi.advanceTimersByTimeAsync(0);
};
const dayString = (daysAgo: number): string => {
	const d = new Date(NOW);
	d.setDate(d.getDate() - daysAgo);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fetched = (p: FakeGarminProvider): string[] => p.fetchCalls.map((c) => c.date);
const signedIn = (patch: Partial<HealthSyncSettings> = {}): Partial<HealthSyncSettings> => ({ garminOAuth1: JSON.stringify(TOKEN1), garminOAuth2: JSON.stringify(TOKEN2), ...patch });

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	FakeGarminProvider.instances = [];
	document.documentElement.lang = "";
});

describe("what the Today card can show", () => {
	it("says unknown while the notes hold too little data to tell, which keeps the switch of the card available", async () => {
		const { plugin } = await load(null);
		expect(plugin.todayAvailability()).toBe("unknown");
	});
});

describe("loading settings", () => {
	it("starts from the defaults on a first run", async () => {
		const { plugin } = await load(null);
		expect(plugin.settings).toMatchObject({ autoSync: true, dailyNoteFormat: "YYYY-MM-DD", unitSystem: "metric", serverRegion: "international" });
		expect(plugin.settings.enabledMetrics["steps"]).toBe(true);
		expect(plugin.settings.enabledMetrics["spo2"]).toBe(false);
	});

	it("keeps saved values and fills in metrics added since the file was saved", async () => {
		const { plugin } = await load({ language: "en", dailyNoteFormat: "DD.MM.YYYY", enabledMetrics: { steps: false } });
		expect(plugin.settings.dailyNoteFormat).toBe("DD.MM.YYYY");
		expect(plugin.settings.enabledMetrics["steps"]).toBe(false);
		expect(plugin.settings.enabledMetrics["hrv"]).toBe(true);
		expect(plugin.settings.enabledMetrics["spo2"]).toBe(false);
	});

	it("takes the language from Obsidian on the first run only", async () => {
		document.documentElement.lang = "de-AT";
		expect((await load(null)).plugin.settings.language).toBe("de");
		expect((await load({ language: "fr" })).plugin.settings.language).toBe("fr");
	});

	it("falls back to English for an unsupported or missing Obsidian language", async () => {
		document.documentElement.lang = "pt-BR";
		expect((await load(null)).plugin.settings.language).toBe("en");
		document.documentElement.lang = "";
		expect((await load(null)).plugin.settings.language).toBe("en");
	});

	it("does not detect a language again once one is saved", async () => {
		document.documentElement.lang = "ja";
		expect((await load({ language: "en" })).plugin.settings.language).toBe("en");
	});
});

describe("F7: the defaults are never changed by a loaded plugin", () => {
	it("does not write toggles or sync times into DEFAULT_SETTINGS (first run)", async () => {
		const before = JSON.stringify(DEFAULT_SETTINGS);
		const { plugin } = await load(null);
		plugin.settings.enabledMetrics["steps"] = false;
		plugin.settings.lastSyncTimes["2026-10-01"] = 123;
		expect(JSON.stringify(DEFAULT_SETTINGS)).toBe(before);
		expect(DEFAULT_SETTINGS.lastSyncTimes).toEqual({});
		expect(DEFAULT_SETTINGS.enabledMetrics["steps"]).toBe(true);
	});

	it("does not write them into DEFAULT_SETTINGS when the saved file lacks the nested objects either", async () => {
		const before = JSON.stringify(DEFAULT_SETTINGS);
		const { plugin } = await load({ language: "en" });
		plugin.settings.lastSyncTimes["2026-10-01"] = 123;
		plugin.settings.enabledMetrics["hrv"] = false;
		expect(JSON.stringify(DEFAULT_SETTINGS)).toBe(before);
	});

	it("gives two loaded plugins independent settings", async () => {
		const a = await load(null);
		const b = await load(null);
		a.plugin.settings.lastSyncTimes["2026-10-01"] = 123;
		a.plugin.settings.enabledMetrics["steps"] = false;
		expect(b.plugin.settings.lastSyncTimes).toEqual({});
		expect(b.plugin.settings.enabledMetrics["steps"]).toBe(true);
	});

	it("keeps the saved nested values", async () => {
		const { plugin } = await load({ lastSyncTimes: { "2026-10-20": 5 }, enabledMetrics: { steps: false } });
		expect(plugin.settings.lastSyncTimes).toEqual({ "2026-10-20": 5 });
		expect(plugin.settings.enabledMetrics["steps"]).toBe(false);
	});
});

describe("F8: switches that never did anything are gone, old files still load", () => {
	it("loads a data.json that still has the removed metric keys, shows no toggle and requests nothing extra", async () => {
		const loaded = await load(signedIn({ enabledMetrics: { ...DEFAULT_SETTINGS.enabledMetrics, stress_high: true, recovery_high: true } as Record<string, boolean> }));
		expect(loaded.plugin.settings.enabledMetrics["stress_high"]).toBe(true);
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		for (const call of loaded.provider.fetchCalls) {
			expect(call.enabledMetrics).toContain("stress_high");
		}
		const note = loaded.app.vault.text(`${dayString(1)}.md`);
		expect(note).not.toContain("stress_high");
		expect(note).not.toContain("recovery_high");
	});
});

describe("history notes of an earlier folder", () => {
	it("move into the history folder of the daily notes folder when Obsidian has loaded", async () => {
		const loaded = await load({ dailyNotePath: "Journal/2027" }, (app) => void app.vault.seed("Journal/2026/Garmin history/Garmin history 2026-10.md", "2026-10-01 {\"a\":1}"));
		loaded.app.workspace.layoutReady();
		await settle();
		expect(loaded.app.vault.paths().filter((p) => p.includes("Garmin history"))).toEqual(["Journal/2027/Garmin history/Garmin history 2026-10.md"]);
	});
});

describe("the backfill log", () => {
	it("keeps what the backfill remembered across restarts, without sharing it with the defaults", async () => {
		const { plugin } = await load({ fetchLog: { "2026-10-01": 0 }, fetchSets: [["hrv", "steps"]] });
		expect(plugin.settings.fetchLog).toEqual({ "2026-10-01": 0 });
		expect(plugin.settings.fetchSets).toEqual([["hrv", "steps"]]);
		plugin.settings.fetchSets[0]!.push("spo2");
		plugin.settings.fetchLog["2026-10-02"] = 0;
		expect((await load(null)).plugin.settings.fetchSets).toEqual([]);
		expect((await load(null)).plugin.settings.fetchLog).toEqual({});
	});
});

describe("days without a daily note", () => {
	it("starts on creating the note, as before", async () => {
		expect((await load(null)).plugin.settings.missingNoteBehaviour).toBe("create");
	});

	it("turns the old switch into the new choice once, and forgets the old key", async () => {
		const off = await load({ createDailyNoteIfMissing: false } as never);
		expect(off.plugin.settings.missingNoteBehaviour).toBe("skip");
		expect("createDailyNoteIfMissing" in off.plugin.settings).toBe(false);
		await off.plugin.saveSettings();
		expect(off.plugin.data).not.toHaveProperty("createDailyNoteIfMissing");
		expect((await load({ createDailyNoteIfMissing: true } as never)).plugin.settings.missingNoteBehaviour).toBe("create");
	});

	it("keeps a choice that was made and replaces one that is not valid", async () => {
		expect((await load({ missingNoteBehaviour: "history", createDailyNoteIfMissing: false } as never)).plugin.settings.missingNoteBehaviour).toBe("history");
		expect((await load({ missingNoteBehaviour: "nonsense" } as never)).plugin.settings.missingNoteBehaviour).toBe("create");
	});
});

describe("import history from daily notes", () => {
	it("copies the Garmin values of the daily notes into the history and says how many days", async () => {
		const { app, plugin } = await load({ dailyNotePath: "" }, (a) => {
			const file = a.vault.seed("2026-10-21.md", "---\nhrv: 40\n---\n");
			a.metadataCache.frontmatter.set(file.path, { hrv: 40, tags: ["x"] });
		});
		plugin.commands.get("import-history-from-notes")!.callback!();
		await settle();
		expect(app.vault.text("Garmin history/Garmin history 2026-10.md")).toContain('2026-10-21 {"hrv":40}');
		expect(Notice.recorded.at(-1)?.message).toBe(en.noticeHistoryImported.replace("{count}", "1"));
	});

	it("says so when the notes hold no Garmin data", async () => {
		const { plugin } = await load({ dailyNotePath: "" });
		plugin.commands.get("import-history-from-notes")!.callback!();
		await settle();
		expect(Notice.recorded.at(-1)?.message).toBe(en.noticeHistoryImportEmpty);
	});
});

describe("properties of daily notes", () => {
	const dailyNote = (): TFile => Object.assign(new TFile(), { path: `${dayString(0)}.md`, basename: dayString(0) });
	const openNote = async (app: App, file: TFile): Promise<void> => {
		app.workspace.activeFile = file;
		app.workspace.fire("file-open", file);
		await vi.advanceTimersByTimeAsync(300);
	};
	const showProperties = (): void => {
		document.body.innerHTML = '<div class="workspace-leaf mod-active"><div class="metadata-container"><div class="metadata-property" data-property-key="hrv"></div><div class="metadata-property" data-property-key="mood"></div></div></div>';
	};
	const hiddenRows = (): string[] => Array.from(document.querySelectorAll(".ghs-property-hidden")).map((r) => r.getAttribute("data-property-key")!);
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("folds a daily note when the setting says fold", async () => {
		const { app } = await load({ propertiesMode: "fold" });
		app.workspace.layoutReady();
		showProperties();
		await openNote(app, dailyNote());
		expect(app.commands.executed).toEqual(["editor:toggle-fold-properties"]);
	});

	it("handles the daily note that is open when Obsidian finishes loading", async () => {
		const { app } = await load({ propertiesMode: "fold" }, (a) => {
			a.workspace.activeFile = dailyNote();
		});
		showProperties();
		app.workspace.layoutReady();
		await vi.advanceTimersByTimeAsync(300);
		expect(app.commands.executed).toEqual(["editor:toggle-fold-properties"]);
	});

	it("leaves daily notes alone when the setting is off, and other notes always", async () => {
		const off = await load({ propertiesMode: "off" });
		off.app.workspace.layoutReady();
		showProperties();
		await openNote(off.app, dailyNote());
		expect(off.app.commands.executed).toEqual([]);

		const on = await load({ propertiesMode: "fold" });
		on.app.workspace.layoutReady();
		showProperties();
		await openNote(on.app, Object.assign(new TFile(), { path: "ideas.md", basename: "ideas" }));
		expect(on.app.commands.executed).toEqual([]);
	});

	it("hides every property the sync wrote, also an activity the plugin does not know, and keeps the user's own, while the panel is on", async () => {
		const fm = { title: "x", mood: "good", hrv: 40, ohs_steps: 9000, mobility: "2x · 27min · Ø74 bpm · 54 kcal", workout_location: "Park", coffee: 0 };
		const rows = (): void => {
			document.body.innerHTML = `<div class="workspace-leaf mod-active"><div class="metadata-container">${["title", "mood", "hrv", "ohs_steps", "mobility", "workout_location", "coffee"].map((k) => `<div class="metadata-property" data-property-key="${k}"></div>`).join("")}</div></div>`;
		};
		const seed = (a: App): void => {
			const file = a.vault.seed(`${dayString(0)}.md`, "---\n---\n");
			a.metadataCache.frontmatter.set(file.path, fm);
		};
		const off = await load({ propertiesMode: "hide", panelEnabled: false }, seed);
		off.app.workspace.layoutReady();
		rows();
		await openNote(off.app, off.app.vault.getMarkdownFiles()[0]!);
		expect(hiddenRows()).toEqual([]);

		const on = await load({ propertiesMode: "hide", panelEnabled: true }, seed);
		on.app.workspace.layoutReady();
		rows();
		const file = on.app.vault.getMarkdownFiles()[0]!;
		await openNote(on.app, file);
		expect(hiddenRows()).toEqual(["hrv", "ohs_steps", "mobility", "workout_location"]);
		// a sync adds a value: the row is hidden when the metadata cache has caught up
		on.app.metadataCache.frontmatter.set(file.path, { ...fm, spo2: 96 });
		document.querySelector(".metadata-container")!.insertAdjacentHTML("beforeend", '<div class="metadata-property" data-property-key="spo2"></div>');
		on.app.metadataCache.fireChanged(file);
		expect(hiddenRows()).toContain("spo2");
		on.plugin.settings.propertiesMode = "off";
		on.plugin.noteProperties.modeChanged();
		expect(hiddenRows()).toEqual([]);

		// a note the metadata cache knows nothing about (yet) has nothing to hide
		const bare = await load({ propertiesMode: "hide", panelEnabled: true }, (a) => void a.vault.seed(`${dayString(0)}.md`, ""));
		bare.app.workspace.layoutReady();
		rows();
		await openNote(bare.app, bare.app.vault.getMarkdownFiles()[0]!);
		expect(hiddenRows()).toEqual([]);
	});

	it("turns the old fold switch into the new choice once, and forgets the old key", async () => {
		const on = await load({ foldProperties: true } as never);
		expect(on.plugin.settings.propertiesMode).toBe("fold");
		expect("foldProperties" in on.plugin.settings).toBe(false);
		expect((await load({ foldProperties: false } as never)).plugin.settings.propertiesMode).toBe("off");
		expect((await load(null)).plugin.settings.propertiesMode).toBe("off");
		expect((await load({ propertiesMode: "hide", foldProperties: true } as never)).plugin.settings.propertiesMode).toBe("hide");
		expect((await load({ propertiesMode: "foldHide" })).plugin.settings.propertiesMode).toBe("foldHide");
		expect((await load({ propertiesMode: "nonsense" } as never)).plugin.settings.propertiesMode).toBe("off");
	});

	it("follows the setting without a restart and stops when the plugin unloads", async () => {
		const { app, plugin } = await load({ propertiesMode: "off" });
		app.workspace.layoutReady();
		showProperties();
		plugin.settings.propertiesMode = "fold";
		app.workspace.activeFile = dailyNote();
		app.workspace.fire("layout-change");
		plugin.noteProperties.modeChanged();
		plugin.unload();
		await vi.advanceTimersByTimeAsync(1000);
		expect(app.commands.executed).toEqual([]);
	});
});

describe("startup", () => {
	it("registers the commands under their stable ids, named in the user's language", async () => {
		const { plugin } = await load({ language: "de" });
		expect([...plugin.commands.keys()].sort()).toEqual(["backfill-health-data", "import-history-from-notes", "login-with-ticket", "open-health-panel", "show-progress", "show-whats-new", "sync-health-data"]);
		expect(plugin.commands.get("show-whats-new")?.name).toBe(de.commandWhatsNew);
		expect(plugin.commands.get("sync-health-data")?.name).toBe(de.commandSync);
		expect(plugin.commands.get("backfill-health-data")?.name).toBe(de.commandBackfill);
		expect(plugin.commands.get("login-with-ticket")?.name).toBe(de.commandManualLogin);
	});

	it("adds the settings tab, tells the provider its version and applies the server region", async () => {
		const { plugin, provider } = await load({ serverRegion: "china" });
		expect(plugin.settingTabs).toHaveLength(1);
		expect(provider.version).toBe("0.11.1-test");
		expect(provider.region).toBe("china");
	});

	it("closes an open login window on unload", async () => {
		const { plugin, provider } = await load();
		plugin.onunload();
		expect(provider.closedLogin).toBe(1);
	});

	describe("finding the daily notes folder", () => {
		it("keeps a folder the user set", async () => {
			const { plugin } = await load({ dailyNotePath: "My/Folder" }, (app) => {
				app.plugins = { plugins: { "periodic-notes": { settings: { daily: { folder: "Other" } } } } };
			});
			expect(plugin.settings.dailyNotePath).toBe("My/Folder");
		});

		it("takes folder and format from Periodic Notes", async () => {
			const { plugin } = await load(null, (app) => {
				app.plugins = { plugins: { "periodic-notes": { settings: { daily: { folder: "Journal", format: "DD.MM.YYYY" } } } } };
			});
			expect(plugin.settings).toMatchObject({ dailyNotePath: "Journal", dailyNoteFormat: "DD.MM.YYYY" });
		});

		it("takes only the folder from Periodic Notes when it has no format", async () => {
			const { plugin } = await load(null, (app) => {
				app.plugins = { plugins: { "periodic-notes": { settings: { daily: { folder: "Journal" } } } } };
			});
			expect(plugin.settings).toMatchObject({ dailyNotePath: "Journal", dailyNoteFormat: "YYYY-MM-DD" });
		});

		it("falls back to the core Daily Notes plugin, with or without a format", async () => {
			const withFormat = await load(null, (app) => {
				app.internalPlugins = { plugins: { "daily-notes": { instance: { options: { folder: "Core", format: "YYYY/MM/DD" } } } } };
			});
			expect(withFormat.plugin.settings).toMatchObject({ dailyNotePath: "Core", dailyNoteFormat: "YYYY/MM/DD" });
			const noFormat = await load(null, (app) => {
				app.internalPlugins = { plugins: { "daily-notes": { instance: { options: { folder: "Core" } } } } };
			});
			expect(noFormat.plugin.settings).toMatchObject({ dailyNotePath: "Core", dailyNoteFormat: "YYYY-MM-DD" });
		});

		it("prefers Periodic Notes over the core plugin, and ignores plugins without a folder", async () => {
			const both = await load(null, (app) => {
				app.plugins = { plugins: { "periodic-notes": { settings: { daily: { folder: "Periodic" } } } } };
				app.internalPlugins = { plugins: { "daily-notes": { instance: { options: { folder: "Core" } } } } };
			});
			expect(both.plugin.settings.dailyNotePath).toBe("Periodic");
			const empty = await load(null, (app) => {
				app.plugins = { plugins: { "periodic-notes": { settings: { daily: {} } } } };
				app.internalPlugins = { plugins: { "daily-notes": { instance: { options: {} } } } };
			});
			expect(empty.plugin.settings.dailyNotePath).toBe("");
			expect((await load()).plugin.settings.dailyNotePath).toBe("");
		});

		it("takes the format of notes in the root of the vault, which have no folder, from Periodic Notes or the core plugin", async () => {
			const periodic = await load(null, (app) => {
				app.plugins = { plugins: { "periodic-notes": { settings: { daily: { folder: "", format: "DD.MM.YYYY" } } } } };
			});
			expect(periodic.plugin.settings).toMatchObject({ dailyNotePath: "", dailyNoteFormat: "DD.MM.YYYY" });
			const core = await load(null, (app) => {
				app.internalPlugins = { plugins: { "daily-notes": { instance: { options: { folder: "", format: "YYYYMMDD" } } } } };
			});
			expect(core.plugin.settings).toMatchObject({ dailyNotePath: "", dailyNoteFormat: "YYYYMMDD" });
			const both = await load(null, (app) => {
				app.plugins = { plugins: { "periodic-notes": { settings: { daily: { format: "DD.MM.YYYY" } } } } };
				app.internalPlugins = { plugins: { "daily-notes": { instance: { options: { format: "YYYYMMDD" } } } } };
			});
			expect(both.plugin.settings.dailyNoteFormat).toBe("DD.MM.YYYY");
		});

		describe("following the daily notes plugin when it changed after the plugin was set up", () => {
			const note = (app: App, path: string): void => void app.vault.seed(path, "x");
			const core = (app: App, folder: string, format = ""): void => {
				app.internalPlugins = { plugins: { "daily-notes": { instance: { options: { folder, format } } } } };
			};
			const started = async (saved: Partial<HealthSyncSettings>, setup: (app: App) => void) => {
				const loaded = await load(saved, setup);
				const saves = loaded.plugin.saves;
				loaded.app.workspace.layoutReady();
				await settle();
				return { ...loaded, saved: loaded.plugin.saves > saves };
			};

			it("moves to the new folder when its daily notes are newer than the ones in the old folder, saves, and says so", async () => {
				const { plugin, saved } = await started({ dailyNotePath: "Old" }, (app) => {
					core(app, "New");
					note(app, "Old/2026-10-10.md");
					note(app, "New/2026-10-24.md");
				});
				expect(plugin.settings).toMatchObject({ dailyNotePath: "New", dailyNoteFormat: "YYYY-MM-DD" });
				expect(saved).toBe(true);
				expect(Notice.messages()).toContain(en.noticeDailyNotesFollowed.replace("{folder}", "New").replace("{format}", "YYYY-MM-DD"));
			});

			it("says it in the plugin language", async () => {
				await started({ dailyNotePath: "Old", language: "de" }, (app) => {
					core(app, "New");
					note(app, "New/2026-10-24.md");
				});
				expect(Notice.messages()).toContain(de.noticeDailyNotesFollowed.replace("{folder}", "New").replace("{format}", "YYYY-MM-DD"));
			});

			it("moves also when the old folder has no daily note at all", async () => {
				const { plugin } = await started({ dailyNotePath: "Old" }, (app) => {
					core(app, "New");
					note(app, "New/2026-10-24.md");
				});
				expect(plugin.settings.dailyNotePath).toBe("New");
			});

			it("follows a new format, with or without a folder change", async () => {
				const format = await started({ dailyNotePath: "Daily" }, (app) => {
					core(app, "Daily", "DD.MM.YYYY");
					note(app, "Daily/2026-10-10.md");
					note(app, "Daily/24.10.2026.md");
				});
				expect(format.plugin.settings).toMatchObject({ dailyNotePath: "Daily", dailyNoteFormat: "DD.MM.YYYY" });
				const both = await started({ dailyNotePath: "Old" }, (app) => {
					core(app, "New", "YYYYMMDD");
					note(app, "New/20261024.md");
				});
				expect(both.plugin.settings).toMatchObject({ dailyNotePath: "New", dailyNoteFormat: "YYYYMMDD" });
			});

			it("follows a daily notes plugin that now keeps its notes in the vault root", async () => {
				const { plugin } = await started({ dailyNotePath: "Old" }, (app) => {
					core(app, "");
					app.internalPlugins = { plugins: { "daily-notes": { instance: { options: { folder: "", format: "YYYY-MM-DD" } } } } };
					note(app, "2026-10-24.md");
					note(app, "Old/2026-10-10.md");
				});
				expect(plugin.settings.dailyNotePath).toBe("");
			});

			it("reads a setup that has only a folder or only a format", async () => {
				const folderOnly = await started({ dailyNotePath: "Old", dailyNoteFormat: "YYYY-MM-DD" }, (app) => {
					app.internalPlugins = { plugins: { "daily-notes": { instance: { options: { folder: "New" } } } } };
					note(app, "New/2026-10-24.md");
				});
				expect(folderOnly.plugin.settings).toMatchObject({ dailyNotePath: "New", dailyNoteFormat: "YYYY-MM-DD" });
				const formatOnly = await started({ dailyNotePath: "Daily" }, (app) => {
					app.plugins = { plugins: { "periodic-notes": { settings: { daily: { format: "DD.MM.YYYY" } } } } };
					note(app, "Daily/24.10.2026.md");
					note(app, "Daily/2026-10-01.md");
				});
				expect(formatOnly.plugin.settings.dailyNoteFormat).toBe("DD.MM.YYYY");
			});

			it("prefers Periodic Notes over the core plugin, as when it was first read", async () => {
				const { plugin } = await started({ dailyNotePath: "Old" }, (app) => {
					core(app, "Core");
					app.plugins = { plugins: { "periodic-notes": { settings: { daily: { folder: "Periodic" } } } } };
					note(app, "Periodic/2026-10-24.md");
					note(app, "Core/2026-10-25.md");
				});
				expect(plugin.settings.dailyNotePath).toBe("Periodic");
			});

			it("keeps the saved folder when it has the newer notes, when the dates are equal, or when the new folder has none", async () => {
				for (const notes of [["Old/2026-10-24.md", "New/2026-10-10.md"], ["Old/2026-10-24.md", "New/2026-10-24.md"], ["Old/2026-10-24.md"], []]) {
					const { plugin, saved } = await started({ dailyNotePath: "Old" }, (app) => {
						core(app, "New");
						for (const path of notes) note(app, path);
					});
					expect(plugin.settings.dailyNotePath, notes.join()).toBe("Old");
					expect(saved).toBe(false);
				}
			});

			it("does nothing when the setup is the same, when no plugin has one, and for notes that are no daily notes", async () => {
				const same = await started({ dailyNotePath: "New" }, (app) => {
					core(app, "New");
					note(app, "New/2026-10-24.md");
				});
				expect(same.saved).toBe(false);
				const none = await started({ dailyNotePath: "Old" }, (app) => note(app, "New/2026-10-24.md"));
				expect(none.plugin.settings.dailyNotePath).toBe("Old");
				const other = await started({ dailyNotePath: "Old" }, (app) => {
					core(app, "New");
					note(app, "New/meeting.md");
				});
				expect(other.plugin.settings.dailyNotePath).toBe("Old");
			});

			it("changes nothing else in the settings", async () => {
				const { plugin } = await started({ dailyNotePath: "Old", usePrefix: true, language: "en", panelEnabled: false }, (app) => {
					core(app, "New");
					note(app, "New/2026-10-24.md");
				});
				expect(plugin.settings).toMatchObject({ usePrefix: true, panelEnabled: false, language: "en" });
			});
		});

		it("keeps a format the user changed, and the default when the plugins have none", async () => {
			const own = await load({ dailyNoteFormat: "YYYY_MM_DD" }, (app) => {
				app.plugins = { plugins: { "periodic-notes": { settings: { daily: { format: "DD.MM.YYYY" } } } } };
			});
			expect(own.plugin.settings.dailyNoteFormat).toBe("YYYY_MM_DD");
			const none = await load(null, (app) => {
				app.internalPlugins = { plugins: { "daily-notes": { instance: { options: { format: "" } } } } };
			});
			expect(none.plugin.settings.dailyNoteFormat).toBe("YYYY-MM-DD");
		});
	});
});

describe("sign-in tokens", () => {
	it("restores them from secret storage", async () => {
		const { provider } = await load(null, (app) => {
			app.secretStorage!.store.set("garmin-health-sync-oauth1", JSON.stringify(TOKEN1));
			app.secretStorage!.store.set("garmin-health-sync-oauth2", JSON.stringify(TOKEN2));
		});
		expect(provider.getTokens()).toEqual({ oauth1: TOKEN1, oauth2: TOKEN2 });
		expect(provider.isSessionValid()).toBe(true);
	});

	it("starts signed out without tokens", async () => {
		const { provider } = await load();
		expect(provider.isSessionValid()).toBe(false);
	});

	it("moves tokens left in data.json into secret storage and clears them there, once", async () => {
		const { app, plugin, provider } = await load(signedIn());
		expect(provider.getTokens()).toEqual({ oauth1: TOKEN1, oauth2: TOKEN2 });
		expect(JSON.parse(app.secretStorage!.store.get("garmin-health-sync-oauth1")!)).toEqual(TOKEN1);
		expect(plugin.settings.garminOAuth1).toBe("");
		expect(plugin.settings.garminOAuth2).toBe("");
		expect((plugin.data as HealthSyncSettings).garminOAuth1).toBe("");
	});

	it("keeps the user signed in and the data.json copy when the secret store cannot be written", async () => {
		const { app, plugin, provider } = await load(signedIn(), (a) => {
			a.secretStorage!.throwOnSet = true;
		});
		void app;
		expect(provider.isSessionValid()).toBe(true);
		expect(plugin.settings.garminOAuth1).toBe(JSON.stringify(TOKEN1));
	});

	it("keeps the data.json copy when the secret store reads back something else", async () => {
		const { plugin, provider } = await load(signedIn(), (a) => {
			a.secretStorage!.readOverride = () => "different";
		});
		expect(provider.isSessionValid()).toBe(true);
		expect(plugin.settings.garminOAuth1).not.toBe("");
	});

	it("prefers the secret store over data.json", async () => {
		const stored = { oauth_token: "STORED", oauth_token_secret: "S" };
		const { provider } = await load(signedIn(), (a) => {
			a.secretStorage!.store.set("garmin-health-sync-oauth1", JSON.stringify(stored));
		});
		expect(provider.getTokens().oauth1).toEqual(stored);
	});

	it("restores an OAuth1 token without an OAuth2 token, and ignores corrupt or empty copies", async () => {
		expect((await load({ garminOAuth1: JSON.stringify(TOKEN1) })).provider.getTokens()).toEqual({ oauth1: TOKEN1, oauth2: null });
		expect((await load({ garminOAuth1: "{not json", garminOAuth2: "oops" })).provider.isSessionValid()).toBe(false);
	});

	it("does not touch storage when there is no legacy copy and no token", async () => {
		const { plugin } = await load();
		expect(plugin.saves).toBe(0);
	});

	it("works when secret storage is unavailable, keeping the tokens in data.json", async () => {
		const { plugin, provider } = await load(signedIn(), (a) => {
			a.secretStorage = undefined;
		});
		expect(provider.isSessionValid()).toBe(true);
		expect(plugin.settings.garminOAuth1).not.toBe("");
	});

	it("writes both tokens to data.json after a sync when secret storage is unavailable", async () => {
		const loaded = await load(signedIn(), (a) => {
			a.secretStorage = undefined;
		});
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		expect(loaded.plugin.data).toMatchObject({ garminOAuth1: JSON.stringify(TOKEN1), garminOAuth2: JSON.stringify(TOKEN2) });
	});

	it("clears only legacy tokens that were really moved (an OAuth2-only leftover is dropped, not stored)", async () => {
		const { plugin, provider } = await load({ garminOAuth2: JSON.stringify(TOKEN2) });
		expect(provider.isSessionValid()).toBe(false);
		expect(plugin.settings.garminOAuth2).toBe("");
	});
});

describe("old cookie sessions", () => {
	it("asks once to sign in again and forgets the old session", async () => {
		const { plugin } = await load({ garminSession: "old-cookie" });
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeMigrationReloginRequired);
		expect(Notice.recorded.find((n) => n.message === en.noticeMigrationReloginRequired)?.duration).toBe(0);
		expect(plugin.settings.garminSession).toBe("");
		expect((plugin.data as HealthSyncSettings).garminSession).toBe("");
		Notice.recorded = [];
		await load(plugin.data as HealthSyncSettings);
		expect(Notice.recorded.map((n) => n.message)).not.toContain(en.noticeMigrationReloginRequired);
	});

	it("says nothing when the user is already signed in with tokens", async () => {
		await load(signedIn({ garminSession: "old-cookie" }));
		expect(Notice.recorded.map((n) => n.message)).not.toContain(en.noticeMigrationReloginRequired);
	});
});

describe("auto-sync: which days are fetched", () => {
	/** Load a signed-in plugin whose notes are created on demand, then run the startup sync. */
	async function startup(data: Partial<HealthSyncSettings> = {}) {
		const loaded = await load(signedIn({ language: "en", ...data }));
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		return loaded;
	}

	it("fetches the last seven full days, oldest first? newest first, never today", async () => {
		const { provider } = await startup();
		expect(fetched(provider)).toEqual([1, 2, 3, 4, 5, 6, 7].map(dayString));
		expect(fetched(provider)).not.toContain(dayString(0));
	});

	it("waits the provider's recommended delay between days and not after the last", async () => {
		const loaded = await load(signedIn());
		const times: number[] = [];
		loaded.provider.onFetch = () => times.push(Date.now());
		loaded.provider.batchDelay = 5000;
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		expect(times).toHaveLength(7);
		expect(times.slice(1).map((t, i) => t - times[i]!)).toEqual(Array(6).fill(5000));
	});

	it("falls back to 2 seconds without a recommendation", async () => {
		const loaded = await load(signedIn());
		const times: number[] = [];
		loaded.provider.onFetch = () => times.push(Date.now());
		(loaded.provider as { getRecommendedBatchDelay?: unknown }).getRecommendedBatchDelay = undefined;
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		expect(times[1]! - times[0]!).toBe(2000);
	});

	it("does nothing with auto-sync switched off", async () => {
		const { provider } = await startup({ autoSync: false });
		expect(provider.fetchCalls).toEqual([]);
	});

	it("skips days synced less than six hours ago within the last 72 hours", async () => {
		const recent = Date.now() - 2 * HOUR;
		const { provider } = await startup({ lastSyncTimes: { [dayString(1)]: recent, [dayString(2)]: recent } });
		expect(fetched(provider)).toEqual([3, 4, 5, 6, 7].map(dayString));
	});

	it("re-syncs a day within 72 hours once the six hour cooldown has passed", async () => {
		const { provider } = await startup({ lastSyncTimes: { [dayString(1)]: Date.now() - 6 * HOUR, [dayString(2)]: Date.now() - 6 * HOUR + MIN } });
		expect(fetched(provider)).toContain(dayString(1));
		expect(fetched(provider)).not.toContain(dayString(2));
	});

	it("syncs days older than 72 hours only if they were never synced", async () => {
		const old = Date.now() - 7 * HOUR;
		const { provider } = await startup({ lastSyncTimes: { [dayString(4)]: old, [dayString(5)]: old } });
		expect(fetched(provider)).not.toContain(dayString(4));
		expect(fetched(provider)).not.toContain(dayString(5));
		expect(fetched(provider)).toContain(dayString(3));
	});

	it("does nothing when every day is within its cooldown", async () => {
		const recent = Date.now() - HOUR;
		const times = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [dayString(n), recent]));
		const { provider } = await startup({ lastSyncTimes: times });
		expect(provider.fetchCalls).toEqual([]);
	});

	it("tells the user how many days it synced, in their language", async () => {
		await startup({ language: "de" });
		expect(Notice.recorded.map((n) => n.message)).toEqual([de.noticeAutoSyncDone.replace("{count}", "7")]);
	});

	it("shows no summary when nothing could be synced", async () => {
		const loaded = await load(signedIn());
		loaded.provider.defaultData = { metrics: {}, activities: {} };
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		expect(Notice.recorded).toEqual([]);
	});
});

describe("auto-sync: the cooldown it sets", () => {
	async function sync(data: Partial<HealthSyncSettings> = {}, prepare: (l: Awaited<ReturnType<typeof load>>) => void = () => undefined) {
		const loaded = await load(signedIn(data));
		prepare(loaded);
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		return loaded;
	}

	it("lets a first successful sync be repeated after 30 minutes", async () => {
		const { plugin } = await sync();
		expect(Date.now() - plugin.settings.lastSyncTimes[dayString(1)]!).toBeGreaterThanOrEqual(5 * HOUR + 30 * MIN);
		expect(plugin.settings.lastSyncTimes[dayString(1)]).toBeLessThanOrEqual(Date.now() - (6 * HOUR - 30 * MIN) + 60_000);
	});

	it("gives a repeated sync of a day the full six hours", async () => {
		const stamp = Date.now() - 7 * HOUR;
		const { plugin } = await sync({ lastSyncTimes: { [dayString(1)]: stamp } });
		expect(Date.now() - plugin.settings.lastSyncTimes[dayString(1)]!).toBeLessThan(HOUR);
	});

	it("retries a day that had no data after one hour", async () => {
		const { plugin } = await sync({}, (l) => {
			l.provider.defaultData = { metrics: {}, activities: {} };
		});
		const stamp = plugin.settings.lastSyncTimes[dayString(1)]!;
		expect(stamp).toBe(Date.now() - (6 * HOUR - HOUR) - (Date.now() - stamp - (6 * HOUR - HOUR)));
		expect(Date.now() - stamp).toBeGreaterThanOrEqual(5 * HOUR);
	});

	it("also cools down a day that failed, so a page switch does not hammer the API", async () => {
		const { plugin } = await sync({}, (l) => {
			l.provider.byDate.set(dayString(1), new Error("503"));
		});
		expect(plugin.settings.lastSyncTimes[dayString(1)]).toBeDefined();
	});

	it("forgets entries older than eight days", async () => {
		const ancient = dayString(20);
		const { plugin } = await sync({ lastSyncTimes: { [ancient]: Date.now() - 9 * 24 * HOUR, [dayString(3)]: Date.now() - HOUR } });
		expect(plugin.settings.lastSyncTimes[ancient]).toBeUndefined();
		expect(plugin.settings.lastSyncTimes[dayString(3)]).toBeDefined();
	});

	it("saves the settings and the tokens after a run", async () => {
		const { plugin, app } = await sync();
		expect((plugin.data as HealthSyncSettings).lastSyncTimes[dayString(1)]).toBeDefined();
		expect(app.secretStorage!.store.get("garmin-health-sync-oauth1")).toBe(JSON.stringify(TOKEN1));
	});
});

describe("auto-sync: pausing and signing in", () => {
	it("shows the sign-in notice instead of syncing when there is no token", async () => {
		const loaded = await load({ language: "en" });
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		expect(loaded.provider.fetchCalls).toEqual([]);
		expect(Notice.recorded.map((n) => n.message)).toEqual([en.noticeSessionExpired + en.noticeLoginAction]);
		expect(Notice.recorded[0]?.duration).toBe(0);
	});

	it("shows that notice at most once every ten minutes, and again after that", async () => {
		const loaded = await load({ language: "en" });
		loaded.app.workspace.layoutReady();
		await settle();
		vi.advanceTimersByTime(31_000);
		loaded.app.workspace.fire("file-open", loaded.app.vault.seed(`${dayString(1)}.md`, "x"));
		await settle();
		expect(Notice.recorded).toHaveLength(1);
		vi.advanceTimersByTime(10 * MIN);
		loaded.app.workspace.fire("file-open", loaded.app.vault.seed(`${dayString(1)}b.md`, "x"));
		await settle();
		vi.advanceTimersByTime(31_000);
		loaded.app.workspace.fire("file-open", loaded.app.vault.getAbstractFileByPath(`${dayString(1)}.md`));
		await settle();
		expect(Notice.recorded).toHaveLength(2);
		expect(Notice.recorded[0]?.hidden).toBe(true);
	});

	it("does nothing while the provider says no (needs login or backing off)", async () => {
		const loaded = await load(signedIn());
		loaded.provider.attemptAllowed = false;
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		expect(loaded.provider.fetchCalls).toEqual([]);
		expect(Notice.recorded).toEqual([]);
	});

	it("shows the sign-in notice when a sync hits a dead token, and persists what changed", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		loaded.provider.byDate.set(dayString(1), new LoginRequiredError());
		loaded.provider.defaultData = { metrics: { steps: 1 }, activities: {} };
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeSessionExpired + en.noticeLoginAction);
	});

	it("shows it when the provider ends up in needsUserLogin, even if the error looked different", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		loaded.provider.authState = "needsUserLogin";
		loaded.provider.byDate.set(dayString(1), new Error("whatever"));
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		// the first day fails inside syncDate (error outcome); the run itself does not throw, so no notice
		expect(Notice.recorded.map((n) => n.message)).not.toContain(en.noticeSessionExpired + en.noticeLoginAction);
	});

	it("does not pause for transient failures: they only set a cooldown", async () => {
		const loaded = await load(signedIn());
		loaded.provider.byDate.set(dayString(1), new Error("503"));
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toHaveLength(7);
	});
});

describe("auto-sync triggers", () => {
	it("syncs when yesterday's or today's daily note is opened, but not for other notes", async () => {
		const loaded = await load(signedIn());
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		loaded.provider.fetchCalls = [];
		vi.advanceTimersByTime(7 * HOUR);
		const other = loaded.app.vault.seed("Notes/random.md", "x");
		loaded.app.workspace.fire("file-open", other);
		await vi.runAllTimersAsync();
		expect(loaded.provider.fetchCalls).toEqual([]);
		const yesterday = loaded.app.vault.getAbstractFileByPath(`${dayString(1)}.md`);
		loaded.app.workspace.fire("file-open", yesterday);
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toContain(dayString(1));
	});

	it("ignores a file-open for something that is not a file", async () => {
		const loaded = await load(signedIn());
		loaded.app.workspace.fire("file-open", null);
		await vi.runAllTimersAsync();
		expect(loaded.provider.fetchCalls).toEqual([]);
	});

	it("does not start a second pass within 30 seconds of the last attempt", async () => {
		const loaded = await load(signedIn());
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		loaded.provider.fetchCalls = [];
		vi.advanceTimersByTime(7 * HOUR - 40_000);
		const file = loaded.app.vault.getAbstractFileByPath(`${dayString(1)}.md`);
		loaded.app.workspace.fire("file-open", file);
		await vi.runAllTimersAsync();
		expect(loaded.provider.fetchCalls.length).toBeGreaterThan(0);
	});

	it("syncs again after signing in, immediately", async () => {
		const loaded = await load({ language: "en" });
		loaded.app.workspace.layoutReady();
		await settle();
		expect(loaded.provider.fetchCalls).toEqual([]);
		loaded.provider.oauth1 = TOKEN1;
		loaded.provider.attemptAllowed = true;
		void loaded.plugin.openCredentialLogin();
		const modal = Modal.opened[0]!;
		const [email, password] = modal.contentEl.querySelectorAll("input");
		email!.value = "me@example.com";
		email!.dispatchEvent(new window.Event("input"));
		password!.value = "pw";
		password!.dispatchEvent(new window.Event("input"));
		(modal.contentEl.querySelector("button.mod-cta") as HTMLButtonElement).click();
		await vi.runAllTimersAsync();
		expect(loaded.provider.credentialCalls).toEqual([["me@example.com", "pw"]]);
		expect(fetched(loaded.provider).length).toBeGreaterThan(0);
	});
});

describe("waiting for the daily note (create-when-missing off)", () => {
	const waiting = { missingNoteBehaviour: "skip" } as const;
	const noteOf = (n: number): string => `${dayString(n)}.md`;

	async function ready(data: Partial<HealthSyncSettings> = {}) {
		const loaded = await load(signedIn({ ...waiting, ...data }));
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		return loaded;
	}

	it("makes no request and creates nothing while no daily note exists", async () => {
		const { provider, app } = await ready();
		expect(provider.fetchCalls).toEqual([]);
		expect(app.vault.paths()).toEqual([]);
	});

	it("syncs the moment a real note for a day in the window gets content", async () => {
		const { provider, app } = await ready();
		const file = app.vault.seed(noteOf(2), "");
		await app.vault.modify(file as never, "# Day\n");
		await vi.runAllTimersAsync();
		expect(fetched(provider)).toEqual([dayString(2)]);
		expect(app.vault.text(noteOf(2))).toContain("steps: 8000");
	});

	it("reacts to a create event for a note that already has content", async () => {
		const { provider, app } = await ready();
		await app.vault.create(noteOf(3), "text");
		await vi.runAllTimersAsync();
		expect(fetched(provider)).toEqual([dayString(3)]);
	});

	it("ignores an empty placeholder note", async () => {
		const { provider, app } = await ready();
		await app.vault.create(noteOf(2), "");
		await vi.runAllTimersAsync();
		expect(provider.fetchCalls).toEqual([]);
	});

	it("ignores files that are not a daily note of the window, and non-files", async () => {
		const { provider, app } = await ready();
		await app.vault.create("random.md", "text");
		await app.vault.create(`${dayString(10)}.md`, "text");
		await app.vault.create(`${dayString(0)}.md`, "text");
		await vi.runAllTimersAsync();
		expect(provider.fetchCalls).toEqual([]);
	});

	it("does not react again to edits of a day that already has a sync time (no loop on its own write)", async () => {
		const { provider, app } = await ready();
		const file = app.vault.seed(noteOf(2), "text");
		await app.vault.modify(file as never, "text 2");
		await vi.runAllTimersAsync();
		const callsAfterFirst = provider.fetchCalls.length;
		expect(callsAfterFirst).toBe(1);
		await app.vault.modify(file as never, "text 3");
		await vi.runAllTimersAsync();
		expect(provider.fetchCalls).toHaveLength(callsAfterFirst);
	});

	it("is quiet when auto-sync is off or when notes are created automatically anyway", async () => {
		const off = await ready({ autoSync: false });
		await off.app.vault.create(noteOf(2), "text");
		await vi.runAllTimersAsync();
		expect(off.provider.fetchCalls).toEqual([]);
		const creating = await load(signedIn({ missingNoteBehaviour: "create" }));
		creating.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		creating.provider.fetchCalls = [];
		await creating.app.vault.create(`${dayString(30)}.md`, "x");
		await vi.runAllTimersAsync();
		expect(creating.provider.fetchCalls).toEqual([]);
	});

	it("does not react to notes written by a running backfill", async () => {
		const { provider, app, plugin } = await ready();
		let release: () => void = () => undefined;
		provider.gate = new Promise<void>((resolve) => (release = resolve));
		app.vault.seed(noteOf(5), "text"); // "skip" visits only days that have a note, so the backfill has a day to hold on
		plugin.commands.get("backfill-health-data")!.callback!();
		(Modal.opened[0]!.contentEl.querySelector("button.mod-cta") as HTMLButtonElement).click();
		await settle();
		await app.vault.create(noteOf(2), "text");
		await settle();
		release();
		await vi.runAllTimersAsync();
		const autoCalls = provider.fetchCalls.filter((c) => c.date === dayString(2));
		expect(autoCalls.length).toBeLessThanOrEqual(1);
	});

	it("queues exactly one more pass when a note appears while a pass is running", async () => {
		const loaded = await load(signedIn(waiting));
		let release: () => void = () => undefined;
		loaded.provider.gate = new Promise<void>((resolve) => (release = resolve));
		loaded.app.vault.seed(noteOf(1), "text");
		loaded.app.workspace.layoutReady();
		await settle();
		expect(loaded.provider.fetchCalls).toHaveLength(1);
		await loaded.app.vault.create(noteOf(2), "text");
		await loaded.app.vault.create(noteOf(3), "text");
		release();
		loaded.provider.gate = null;
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider).sort()).toEqual([dayString(1), dayString(2), dayString(3)].sort());
	});
});

// ---------------------------------------------------------------------------
// Manual sync: which note, which date
// ---------------------------------------------------------------------------

import { moment } from "../testUtils/mocks/obsidian";

const momentFn = moment as unknown as { (d: string, f: string): { format(f: string): string }; locale(l?: string): string };

describe("manual sync", () => {
	async function manual(open: string | null, data: Partial<HealthSyncSettings> = {}, seedFiles: string[] = []) {
		const loaded = await load(signedIn(data));
		for (const f of seedFiles) loaded.app.vault.seed(f, "text");
		if (open) loaded.app.workspace.activeFile = (loaded.app.vault.getAbstractFileByPath(open) ?? loaded.app.vault.seed(open, "text")) as TFile;
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		return loaded;
	}

	it("asks the user to sign in when there is no session, and fetches nothing", async () => {
		const loaded = await load({ language: "en" });
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await settle();
		expect(Notice.recorded.map((n) => n.message)).toEqual([en.noticeLoginRequired]);
		expect(loaded.provider.fetchCalls).toEqual([]);
	});

	it("syncs yesterday when no note is open", async () => {
		const { provider } = await manual(null);
		expect(fetched(provider)).toEqual([dayString(1)]);
	});

	it("syncs the date of the open daily note", async () => {
		const { provider, app } = await manual("2026-10-20.md");
		expect(fetched(provider)).toEqual(["2026-10-20"]);
		expect(app.vault.text("2026-10-20.md")).toContain("steps: 8000");
	});

	it("falls back to yesterday for a note that is not a daily note", async () => {
		const { provider } = await manual("Notes/ideas.md");
		expect(fetched(provider)).toEqual([dayString(1)]);
	});

	it("falls back to yesterday for a daily note outside the configured folder", async () => {
		const { provider } = await manual("Other/2026-10-20.md", { dailyNotePath: "Daily" });
		expect(fetched(provider)).toEqual([dayString(1)]);
	});

	it("reads the date of a note inside the configured folder, with slashes around the setting", async () => {
		const { provider } = await manual("Daily/2026-10-20.md", { dailyNotePath: "/Daily/" });
		expect(fetched(provider)).toEqual(["2026-10-20"]);
	});

	it.each([
		["DD.MM.YYYY", "20.10.2026.md"],
		["[Journal] YYYY-MM-DD", "Journal 2026-10-20.md"],
		["YYYY/MM/DD", "2026/10/20.md"],
		["YYYY/YYYY-MM-DD", "2026/2026-10-20.md"],
		["YYYYMMDD", "20261020.md"],
		["[Day ]YYYY-MM-DD[ (log)]", "Day 2026-10-20 (log).md"],
	])("reads the date from the format %s", async (format, file) => {
		const { provider } = await manual(file, { dailyNoteFormat: format });
		expect(fetched(provider)).toEqual(["2026-10-20"]);
	});

	it("does not accept a path whose repeated year disagrees", async () => {
		const { provider } = await manual("2025/2026-10-20.md", { dailyNoteFormat: "YYYY/YYYY-MM-DD" });
		expect(fetched(provider)).toEqual([dayString(1)]);
	});

	it("recognises a note moved into a hand-made subfolder below the configured folder", async () => {
		const { provider } = await manual("Daily/archive/2026-10-20.md", { dailyNotePath: "Daily" });
		expect(fetched(provider)).toEqual(["2026-10-20"]);
	});

	it("takes a literal bracket without a closing bracket as plain text", async () => {
		const { provider } = await manual("[x 2026-10-20.md", { dailyNoteFormat: "[x YYYY-MM-DD" });
		expect(fetched(provider)).toEqual(["2026-10-20"]);
	});

	it("records the sync time after a successful sync only", async () => {
		const ok = await manual("2026-10-20.md");
		expect(ok.plugin.settings.lastSyncTimes["2026-10-20"]).toBe(Date.now());
		const failing = await load(signedIn());
		failing.provider.byDate.set("2026-10-20", new Error("503"));
		failing.app.workspace.activeFile = failing.app.vault.seed("2026-10-20.md", "text") as TFile;
		failing.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(failing.plugin.settings.lastSyncTimes["2026-10-20"]).toBeUndefined();
	});

	it("saves the settings and tokens, and shows the sign-in notice when the token is dead", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		loaded.provider.byDate.set(dayString(1), new LoginRequiredError());
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeSessionExpired + en.noticeLoginAction);
		expect(loaded.plugin.saves).toBeGreaterThan(0);
	});

	it("stays quiet about login for other failures", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		loaded.provider.byDate.set(dayString(1), new Error("503"));
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(Notice.recorded.map((n) => n.message)).not.toContain(en.noticeSessionExpired + en.noticeLoginAction);
	});

	it("shows the sign-in notice when the provider reports needsUserLogin after an error", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		loaded.provider.authState = "needsUserLogin";
		loaded.provider.fetchData = () => Promise.reject(new Error("dead"));
		loaded.provider.fetchData = async () => {
			throw new LoginRequiredError();
		};
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeSessionExpired + en.noticeLoginAction);
	});
});

describe("F5: manual sync for formats with weekday, month name or other tokens", () => {
	afterEachLocale();

	function afterEachLocale(): void {
		beforeEach(() => {
			momentFn.locale("en");
		});
	}

	async function manualWith(format: string, dateInName: string, data: Partial<HealthSyncSettings> = {}) {
		const name = `${momentFn(dateInName, "YYYY-MM-DD").format(format)}.md`;
		const loaded = await load(signedIn({ dailyNoteFormat: format, ...data }));
		loaded.app.workspace.activeFile = loaded.app.vault.seed(name, "text") as TFile;
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		return { ...loaded, name };
	}

	it.each(["YYYY-MM-DD ddd", "D MMM YYYY", "dddd, MMMM Do YYYY", "YYYY-[W]WW-E", "ddd DD.MM.YYYY", "YYYY-MM-DD dd"])(
		"syncs the date of the open note for the format %s, into that very note",
		async (format) => {
			const { provider, app, name } = await manualWith(format, "2026-10-20");
			expect(fetched(provider)).toEqual(["2026-10-20"]);
			expect(app.vault.paths()).toEqual([name]);
			expect(app.vault.text(name)).toContain("steps: 8000");
		},
	);

	it("also opens the note in a folder", async () => {
		const { provider } = await manualWith("YYYY-MM-DD ddd", "2026-10-20", { dailyNotePath: "Daily" });
		expect(fetched(provider)).toEqual([dayString(1)]);
		const nested = await load(signedIn({ dailyNoteFormat: "YYYY-MM-DD ddd", dailyNotePath: "Daily" }));
		nested.app.workspace.activeFile = nested.app.vault.seed("Daily/2026-10-20 Tue.md", "text") as TFile;
		nested.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(fetched(nested.provider)).toEqual(["2026-10-20"]);
	});

	it("uses the weekday and month names of the app language (German)", async () => {
		momentFn.locale("de");
		const { provider, name } = await manualWith("YYYY-MM-DD ddd", "2026-10-20");
		expect(name).toMatch(/Di\.?\.md$/);
		expect(fetched(provider)).toEqual(["2026-10-20"]);
		const month = await manualWith("D MMM YYYY", "2026-10-21");
		expect(fetched(month.provider)).toEqual(["2026-10-21"]);
	});

	it("uses the Chinese names too", async () => {
		momentFn.locale("zh-cn");
		const { provider } = await manualWith("YYYY-MM-DD ddd", "2026-10-20");
		expect(fetched(provider)).toEqual(["2026-10-20"]);
	});

	it("does not guess when the name was written in another language: falls back to yesterday", async () => {
		momentFn.locale("de");
		const loaded = await load(signedIn({ dailyNoteFormat: "YYYY-MM-DD ddd" }));
		loaded.app.workspace.activeFile = loaded.app.vault.seed("2026-10-20 Tue.md", "text") as TFile;
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toEqual([dayString(1)]);
	});

	it("does not accept a name whose weekday disagrees with its date", async () => {
		const loaded = await load(signedIn({ dailyNoteFormat: "YYYY-MM-DD ddd" }));
		loaded.app.workspace.activeFile = loaded.app.vault.seed("2026-10-20 Fri.md", "text") as TFile;
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toEqual([dayString(1)]);
	});

	it("does not accept an impossible date or a name that merely resembles the format", async () => {
		for (const name of ["2026-02-30 Mon.md", "notes 2026-10-20 Tue.md", "2026-10-20 Tue extra.md"]) {
			const loaded = await load(signedIn({ dailyNoteFormat: "YYYY-MM-DD ddd" }));
			loaded.app.workspace.activeFile = loaded.app.vault.seed(name, "text") as TFile;
			loaded.plugin.commands.get("sync-health-data")!.callback!();
			await vi.runAllTimersAsync();
			expect(fetched(loaded.provider), name).toEqual([dayString(1)]);
		}
	});

	it("also triggers the auto-sync when such a note is opened", async () => {
		const loaded = await load(signedIn({ dailyNoteFormat: "YYYY-MM-DD ddd" }));
		const yesterday = momentFn(dayString(1), "YYYY-MM-DD").format("YYYY-MM-DD ddd");
		const file = loaded.app.vault.seed(`${yesterday}.md`, "text");
		loaded.app.workspace.fire("file-open", file);
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toContain(dayString(1));
	});

	it("keeps plain formats on the fast path, unchanged", async () => {
		const { provider } = await manualWith("YYYY-MM-DD", "2026-10-20");
		expect(fetched(provider)).toEqual(["2026-10-20"]);
	});
});

// ---------------------------------------------------------------------------
// Signing in and out
// ---------------------------------------------------------------------------

function fill(modal: Modal, values: string[]): void {
	const inputs = [...modal.contentEl.querySelectorAll<HTMLInputElement>("input")];
	values.forEach((v, i) => {
		inputs[i]!.value = v;
		inputs[i]!.dispatchEvent(new window.Event("input"));
	});
}
const press = (modal: Modal, selector: string): void => (modal.contentEl.querySelector(selector) as HTMLButtonElement).click();

describe("signing in with email and password", () => {
	it("opens one dialog at a time", async () => {
		const loaded = await load({ language: "en" });
		loaded.plugin.openCredentialLogin();
		loaded.plugin.openCredentialLogin();
		expect(Modal.opened).toHaveLength(1);
		Modal.opened[0]!.close();
		loaded.plugin.openCredentialLogin();
		expect(Modal.opened).toHaveLength(2);
	});

	it("signs in, stores the tokens in secret storage, thanks the user and starts a sync", async () => {
		const loaded = await load({ language: "en" });
		const done = vi.fn();
		loaded.plugin.openCredentialLogin(done);
		const modal = Modal.opened[0]!;
		fill(modal, ["me@example.com", "pw"]);
		press(modal, "button.mod-cta");
		await vi.runAllTimersAsync();
		expect(loaded.provider.credentialCalls).toEqual([["me@example.com", "pw"]]);
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeLoginSuccess);
		expect(loaded.app.secretStorage!.store.get("garmin-health-sync-oauth1")).toContain("\"oauth_token\"");
		expect(done).toHaveBeenCalledOnce();
		expect(modal.isOpen).toBe(false);
		expect(fetched(loaded.provider).length).toBeGreaterThan(0);
	});

	it("passes the step log and the attempt timing to the diagnostics button of the failure screen", async () => {
		const loaded = await load({ language: "en" });
		loaded.provider.credentialOutcome = { status: "error", reason: "unexpected", detail: "x" };
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
		loaded.plugin.openCredentialLogin();
		const modal = Modal.opened[0]!;
		fill(modal, ["a@b.c", "pw"]);
		press(modal, "button.mod-cta");
		await vi.runAllTimersAsync();
		const buttons = [...modal.contentEl.querySelectorAll("button")];
		buttons.find((b) => b.textContent === en.modalCredCopyDiagnostics)!.click();
		await vi.runAllTimersAsync();
		expect(writeText.mock.calls[0]?.[0]).toBe("login log\nprevious attempt: none, blocks in a row: 0");
	});

	it("a rate-limited attempt starts the cooldown that the dialog counts down", async () => {
		const loaded = await load({ language: "en" });
		loaded.provider.credentialOutcome = { status: "error", reason: "rate_limited", detail: "x" };
		loaded.plugin.openCredentialLogin();
		const modal = Modal.opened[0]!;
		fill(modal, ["a@b.c", "pw"]);
		press(modal, "button.mod-cta");
		await settle();
		expect(modal.contentEl.textContent).toContain(en.modalCredErrorRateLimited);
		expect(modal.contentEl.textContent).toContain("5:00");
	});

	it("verifies a two-step code through the provider", async () => {
		const loaded = await load({ language: "en" });
		loaded.provider.credentialOutcome = { status: "mfa", method: "email" };
		loaded.plugin.openCredentialLogin();
		const modal = Modal.opened[0]!;
		fill(modal, ["a@b.c", "pw"]);
		press(modal, "button.mod-cta");
		await settle();
		fill(modal, ["123456"]);
		loaded.provider.oauth1 = TOKEN1;
		press(modal, "button.mod-cta");
		await vi.runAllTimersAsync();
		expect(loaded.provider.mfaCalls).toEqual(["123456"]);
		expect(modal.isOpen).toBe(false);
	});

	it("falls back to the browser login from the dialog", async () => {
		const loaded = await load({ language: "en" });
		loaded.plugin.openCredentialLogin();
		const modal = Modal.opened[0]!;
		const buttons = [...modal.contentEl.querySelectorAll("button")];
		buttons.find((b) => b.textContent === en.modalCredBrowserFallback)!.click();
		expect(Modal.opened).toHaveLength(2);
		expect(Modal.opened[1]!.contentEl.querySelector("h2")?.textContent).toBe(en.modalManualLoginTitle);
	});
});

describe("signing in with a ticket", () => {
	async function openManual(loaded: Awaited<ReturnType<typeof load>>, done?: () => void) {
		loaded.plugin.openManualLogin(done);
		const modal = Modal.opened.at(-1)!;
		fill(modal, ["ST-1234567-abcdef"]);
		[...modal.contentEl.querySelectorAll("button")].find((b) => b.textContent === en.modalManualLoginSubmit)!.click();
		await vi.runAllTimersAsync();
		return modal;
	}

	it("passes the pasted ticket to the provider, then thanks the user and closes the dialog", async () => {
		const loaded = await load({ language: "en" });
		const done = vi.fn();
		const modal = await openManual(loaded, done);
		expect(loaded.provider.ticketCalls).toEqual(["ST-1234567-abcdef"]);
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeLoginSuccess);
		expect(done).toHaveBeenCalledOnce();
		expect(modal.isOpen).toBe(false);
	});

	it("tells the user when the ticket was refused, and keeps the dialog open", async () => {
		const loaded = await load({ language: "en" });
		loaded.provider.ticketResult = false;
		const done = vi.fn();
		const modal = await openManual(loaded, done);
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeManualLoginFailed);
		expect(done).not.toHaveBeenCalled();
		expect(modal.isOpen).toBe(true);
	});

	it("treats an exception during the ticket login as a failed login", async () => {
		const loaded = await load({ language: "en" });
		loaded.provider.ticketResult = new Error("boom");
		const modal = await openManual(loaded);
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeManualLoginFailed);
		expect(modal.isOpen).toBe(true);
	});

	it("is reachable through its command", async () => {
		const loaded = await load({ language: "en" });
		loaded.plugin.commands.get("login-with-ticket")!.callback!();
		expect(Modal.opened[0]!.contentEl.querySelector("h2")?.textContent).toBe(en.modalManualLoginTitle);
	});

	it("opens without a completion callback", async () => {
		const loaded = await load({ language: "en" });
		await openManual(loaded);
		expect(loaded.provider.ticketCalls).toHaveLength(1);
	});
});

describe("the sign-in notice", () => {
	async function expired() {
		const loaded = await load({ language: "en" });
		loaded.app.workspace.layoutReady();
		await settle();
		const notice = Notice.recorded[0]!;
		const button = notice.fragment!.querySelector("button")!;
		return { ...loaded, notice, button };
	}

	it("offers a button that starts the sign-in and shows progress while it runs", async () => {
		const { button } = await expired();
		button.click();
		expect(button.disabled).toBe(true);
		expect(button.textContent).toBe(en.noticeLoginInProgress);
		expect(Modal.opened).toHaveLength(1);
	});

	it("closes after a successful sign-in", async () => {
		const { button, notice, provider } = await expired();
		button.click();
		await settle(); // the dialog is open and the user has not signed in yet
		expect(notice.hidden).toBe(false);
		const modal = Modal.opened[0]!;
		fill(modal, ["a@b.c", "pw"]);
		press(modal, "button.mod-cta");
		await vi.runAllTimersAsync();
		expect(provider.credentialCalls).toHaveLength(1);
		expect(notice.hidden).toBe(true);
	});

	it("re-enables the button when the sign-in did not happen", async () => {
		const { button } = await expired();
		button.click();
		await settle();
		expect(button.disabled).toBe(false);
		expect(button.textContent).toBe(en.noticeLoginAction);
	});

	it("closes the notice as soon as a session exists and the state is fine, even if the dialog was just closed", async () => {
		const { button, notice, provider } = await expired();
		provider.oauth1 = TOKEN1;
		button.click();
		await settle();
		expect(notice.hidden).toBe(true);
	});

	it("keeps the notice and the button when the session exists but the provider still needs a login", async () => {
		const { button, notice, provider } = await expired();
		provider.oauth1 = TOKEN1;
		provider.authState = "needsUserLogin";
		button.click();
		await settle();
		expect(notice.hidden).toBe(false);
		expect(button.disabled).toBe(false);
	});
});

describe("logging out", () => {
	it("clears the session, the stored tokens and every copy in data.json", async () => {
		const loaded = await load(signedIn({ garminSession: "" }));
		await loaded.plugin.logout();
		expect(loaded.provider.clearedSession).toBe(1);
		expect(loaded.provider.isSessionValid()).toBe(false);
		expect(loaded.app.secretStorage!.store.get("garmin-health-sync-oauth1")).toBe("");
		expect(loaded.plugin.isSessionValid()).toBe(false);
		expect(loaded.plugin.data).toMatchObject({ garminSession: "", garminOAuth1: "", garminOAuth2: "" });
	});

	it("still logs out when the secret store cannot be cleared", async () => {
		const loaded = await load(null, (a) => {
			a.secretStorage = undefined;
		});
		const warn = vi.spyOn(console, "warn");
		await loaded.plugin.logout();
		expect(warn).toHaveBeenCalled();
		expect(loaded.provider.clearedSession).toBe(1);
	});
});

describe("diagnostics and misc", () => {
	it("hands out the provider's sync log, or says nothing ran yet", async () => {
		const loaded = await load();
		expect(loaded.plugin.getSyncDiagnostics().split("\n")[0]).toBe("no sync run since the plugin started");
		loaded.provider.diagnostics = "plugin v1, platform=ios";
		expect(loaded.plugin.getSyncDiagnostics().split("\n")[0]).toBe("plugin v1, platform=ios");
	});

	it("adds what the panel sees in the vault: the settings that pick the notes, the counts and the Garmin properties of the newest note, no value and no name", async () => {
		const loaded = await load({ dailyNotePath: "Private folder", dailyNoteFormat: "DD.MM.YYYY" }, (app) => {
			for (const [path, fm] of Object.entries({ "Private folder/28.10.2026.md": { tags: ["x"] }, "Private folder/29.10.2026.md": { ohs_steps: 8123, hrv: 48, mood: "secret", ohs_lifestyle_x: 1 }, "Private folder/meeting.md": { steps: 1 } })) {
				app.vault.seed(path, "x");
				app.metadataCache.frontmatter.set(path, fm);
			}
		});
		const line = loaded.plugin.getSyncDiagnostics().split("\n").at(-1)!;
		expect(line).toBe("notes: panel=off, folder=set, format=DD.MM.YYYY, daily notes found=2 (newest 2026-10-29), with Garmin properties=1 (newest 2026-10-29), its properties: [ohs_steps, hrv] and 2 other");
		for (const secret of ["Private folder", "8123", "secret", "meeting"]) expect(line, secret).not.toContain(secret);
	});

	it("says so when it finds no daily note", async () => {
		const loaded = await load();
		expect(loaded.plugin.getSyncDiagnostics().split("\n").at(-1)).toBe("notes: panel=off, folder=none, format=YYYY-MM-DD, daily notes found=0 (newest -), with Garmin properties=0 (newest -), its properties: none");
		loaded.plugin.settings.dailyNoteFormat = "";
		loaded.plugin.settings.panelEnabled = true;
		expect(loaded.plugin.getSyncDiagnostics().split("\n").at(-1)).toContain("panel=on, folder=none, format=(empty)");
	});

	it("applies a changed server region to the provider", async () => {
		const loaded = await load();
		loaded.plugin.settings.serverRegion = "china";
		loaded.plugin.applyServerRegion();
		expect(loaded.provider.region).toBe("china");
	});

	it("reports whether a session exists", async () => {
		expect((await load()).plugin.isSessionValid()).toBe(false);
		expect((await load(signedIn())).plugin.isSessionValid()).toBe(true);
	});

	it("uses mobile dialog text and does not need desktop APIs", async () => {
		Platform.isDesktopApp = false;
		const loaded = await load({ language: "en" });
		loaded.plugin.openManualLogin();
		expect(Modal.opened[0]!.contentEl.textContent).toContain(en.modalManualLoginStep3Mobile.slice(0, 20));
	});

	it("tracks every Setting row it renders in the dialogs (sanity check of the test mock)", async () => {
		const loaded = await load();
		loaded.plugin.openCredentialLogin();
		expect(Setting.all.length).toBeGreaterThan(2);
	});
});

// ---------------------------------------------------------------------------
// Remaining branches of the plugin shell
// ---------------------------------------------------------------------------

describe("triggers while busy or too soon", () => {
	it("a normal trigger during a running pass is dropped, not queued", async () => {
		const loaded = await load(signedIn());
		let release: () => void = () => undefined;
		loaded.provider.gate = new Promise<void>((resolve) => (release = resolve));
		loaded.app.workspace.layoutReady();
		await settle();
		loaded.app.workspace.fire("file-open", loaded.app.vault.seed(`${dayString(1)}.md`, "x"));
		await settle();
		loaded.provider.gate = null;
		release();
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toHaveLength(7);
	});

	it("ignores a trigger within 30 seconds of the last attempt and accepts it afterwards", async () => {
		const loaded = await load({ language: "en" });
		loaded.app.workspace.layoutReady();
		await settle();
		loaded.provider.oauth1 = TOKEN1;
		loaded.app.workspace.fire("file-open", loaded.app.vault.seed(`${dayString(1)}.md`, "x"));
		await vi.runAllTimersAsync();
		expect(loaded.provider.fetchCalls).toEqual([]);
		vi.setSystemTime(Date.now() + 31_000);
		loaded.app.workspace.fire("file-open", loaded.app.vault.getAbstractFileByPath(`${dayString(1)}.md`));
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider).length).toBeGreaterThan(0);
	});

	it("ignores create/modify events for folders", async () => {
		const loaded = await load(signedIn({ missingNoteBehaviour: "skip" }));
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		loaded.app.vault.fire("create", loaded.app.vault.root);
		await vi.runAllTimersAsync();
		expect(loaded.provider.fetchCalls).toEqual([]);
	});
});

describe("failures outside a single day", () => {
	it("an auto-sync that fails for another reason is logged and retried later, without a sign-in notice", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		loaded.provider.getRecommendedBatchDelay = () => {
			throw new Error("boom");
		};
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		expect(Notice.recorded).toEqual([]);
		expect(loaded.plugin.saves).toBeGreaterThan(0);
	});

	it("shows the sign-in notice for that kind of failure when the provider is in needsUserLogin", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		loaded.provider.authState = "needsUserLogin";
		loaded.provider.getRecommendedBatchDelay = () => {
			throw new Error("boom");
		};
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeSessionExpired + en.noticeLoginAction);
	});

	it("a manual sync that fails outside the day shows the notice only for needsUserLogin", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		loaded.provider.isConfigured = () => {
			throw new Error("boom");
		};
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(Notice.recorded).toEqual([]);
		loaded.provider.authState = "needsUserLogin";
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeSessionExpired + en.noticeLoginAction);
	});
});

describe("sign-in details", () => {
	it("reports how long ago the previous attempt was in the diagnostics", async () => {
		const loaded = await load({ language: "en" });
		loaded.provider.credentialOutcome = { status: "error", reason: "invalid_credentials", detail: "x" };
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
		loaded.plugin.openCredentialLogin();
		const modal = Modal.opened[0]!;
		fill(modal, ["a@b.c", "pw"]);
		press(modal, "button.mod-cta");
		await settle();
		vi.setSystemTime(Date.now() + 42_000);
		fill(modal, ["a@b.c", "pw2"]);
		loaded.provider.credentialOutcome = { status: "error", reason: "unexpected", detail: "x" };
		press(modal, "button.mod-cta");
		await settle();
		[...modal.contentEl.querySelectorAll("button")].find((b) => b.textContent === en.modalCredCopyDiagnostics)!.click();
		await settle();
		expect(writeText.mock.calls[0]?.[0]).toContain("previous attempt: 42s ago");
	});

	it("keeps the tokens in data.json when secret storage is unavailable, and writes nothing for a missing OAuth2 token", async () => {
		const loaded = await load({ language: "en" }, (a) => {
			a.secretStorage = undefined;
		});
		loaded.provider.credentialOutcome = { status: "ok" };
		loaded.plugin.openCredentialLogin();
		const modal = Modal.opened[0]!;
		fill(modal, ["a@b.c", "pw"]);
		press(modal, "button.mod-cta");
		await vi.runAllTimersAsync();
		expect((loaded.plugin.data as HealthSyncSettings).garminOAuth1).toContain("oauth_token");
		expect((loaded.plugin.data as HealthSyncSettings).garminOAuth2).toBe("");
	});

	it("writes empty strings to data.json when a dead token is dropped and secret storage is unavailable", async () => {
		const loaded = await load(signedIn({ language: "en" }), (a) => {
			a.secretStorage = undefined;
		});
		loaded.provider.fetchData = async () => {
			loaded.provider.oauth1 = null;
			loaded.provider.oauth2 = null;
			throw new LoginRequiredError();
		};
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(loaded.plugin.data).toMatchObject({ garminOAuth1: "", garminOAuth2: "" });
	});

	it("a newer sign-in notice is not cleared by an older one's button", async () => {
		const loaded = await load({ language: "en" });
		loaded.app.workspace.layoutReady();
		await settle();
		const first = Notice.recorded[0]!;
		vi.setSystemTime(Date.now() + 11 * MIN);
		loaded.app.workspace.fire("file-open", loaded.app.vault.seed(`${dayString(1)}.md`, "x"));
		await settle();
		const second = Notice.recorded[1]!;
		expect(first.hidden).toBe(true);
		first.fragment!.querySelector("button")!.click();
		const modal = Modal.opened[0]!;
		fill(modal, ["a@b.c", "pw"]);
		press(modal, "button.mod-cta");
		await vi.runAllTimersAsync();
		expect(second.hidden).toBe(false);
	});
});

describe("daily note format corner cases", () => {
	it("uses the default format when the setting is empty", async () => {
		const loaded = await load(signedIn({ dailyNoteFormat: "" }));
		loaded.app.workspace.fire("file-open", loaded.app.vault.seed(`${dayString(1)}.md`, "x"));
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toContain(dayString(1));
	});

	it("does not read a date from a format that has no day", async () => {
		const loaded = await load(signedIn({ dailyNoteFormat: "YYYY-MM" }));
		loaded.app.workspace.activeFile = loaded.app.vault.seed("2026-10.md", "x") as TFile;
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toEqual([dayString(1)]);
	});

	it("recognises a weekday-format note that was moved into a hand-made subfolder", async () => {
		const loaded = await load(signedIn({ dailyNoteFormat: "YYYY-MM-DD ddd", dailyNotePath: "Daily" }));
		loaded.app.workspace.activeFile = loaded.app.vault.seed("Daily/archive/2026-10-20 Tue.md", "x") as TFile;
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toEqual(["2026-10-20"]);
	});

	it("does not look at the bare file name for a format with folders", async () => {
		const loaded = await load(signedIn({ dailyNoteFormat: "YYYY/MM/DD ddd", dailyNotePath: "Daily" }));
		loaded.app.workspace.activeFile = loaded.app.vault.seed("Daily/misc/2026-10-20 Tue.md", "x") as TFile;
		loaded.plugin.commands.get("sync-health-data")!.callback!();
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toEqual([dayString(1)]);
	});
});

// ---------------------------------------------------------------------------
// Background work never leaves an unhandled rejection (WKWebView can turn those into a load failure)
// ---------------------------------------------------------------------------

describe("background work that fails", () => {
	/** Collects unhandled rejections raised while `action` runs, waiting a real tick afterwards. */
	async function unhandledDuring(action: () => Promise<void>): Promise<unknown[]> {
		const seen: unknown[] = [];
		const handler = (reason: unknown): void => {
			seen.push(reason);
		};
		process.on("unhandledRejection", handler);
		try {
			await action();
			await vi.runAllTimersAsync();
			vi.useRealTimers();
			await new Promise((resolve) => setTimeout(resolve, 5));
		} finally {
			process.off("unhandledRejection", handler);
			vi.useFakeTimers();
			vi.setSystemTime(NOW);
		}
		return seen;
	}
	const failSaves = (loaded: Awaited<ReturnType<typeof load>>): void => {
		loaded.plugin.saveData = () => Promise.reject(new Error("disk full"));
	};

	it("an auto-sync pass whose settings cannot be saved is logged, not thrown into the void", async () => {
		const loaded = await load(signedIn());
		failSaves(loaded);
		const seen = await unhandledDuring(async () => {
			loaded.app.workspace.layoutReady();
		});
		expect(seen).toEqual([]);
		expect(console.error).toHaveBeenCalled();
	});

	it("a backfill whose settings cannot be saved is logged, not thrown into the void", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		failSaves(loaded);
		const seen = await unhandledDuring(async () => {
			loaded.plugin.commands.get("backfill-health-data")!.callback!();
			(Modal.opened.at(-1)!.contentEl.querySelector("button.mod-cta") as HTMLButtonElement).click();
		});
		expect(seen).toEqual([]);
	});

	it("a sign-in notice button whose follow-up fails is logged, not thrown into the void", async () => {
		const loaded = await load({ language: "en" });
		loaded.app.workspace.layoutReady();
		await settle();
		const button = Notice.recorded[0]!.fragment!.querySelector("button")!;
		loaded.plugin.loginViaBrowser = () => Promise.reject(new Error("modal failed"));
		const seen = await unhandledDuring(async () => {
			button.click();
		});
		expect(seen).toEqual([]);
	});

	it("a note appearing while saves fail does not raise one either", async () => {
		const loaded = await load(signedIn({ missingNoteBehaviour: "skip" }));
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		failSaves(loaded);
		const seen = await unhandledDuring(async () => {
			await loaded.app.vault.create(`${dayString(2)}.md`, "text");
		});
		expect(seen).toEqual([]);
	});
});

describe("onload", () => {
	it("a failing settings save during startup does not stop the plugin from loading", async () => {
		const app = new App();
		const plugin = new HealthSyncPlugin(app as never, { version: "0.11.1-test" } as never) as Loaded["plugin"];
		plugin.data = signedIn({ garminSession: "old-cookie" });
		plugin.saveData = () => Promise.reject(new Error("disk full"));
		await expect(plugin.onload()).resolves.toBeUndefined();
		expect(plugin.commands.has("sync-health-data")).toBe(true);
		expect(FakeGarminProvider.last().isSessionValid()).toBe(true);
	});

	it("shows the real error in a notice that stays, and still rethrows, when loading fails", async () => {
		const app = new App();
		const plugin = new HealthSyncPlugin(app as never, { version: "0.11.1-test" } as never) as Loaded["plugin"];
		plugin.data = { language: "de" };
		plugin.addCommand = () => {
			throw new Error("addCommand exploded");
		};
		await expect(plugin.onload()).rejects.toThrow("addCommand exploded");
		const shown = Notice.recorded.at(-1)!;
		expect(shown.message).toBe(de.noticeLoadFailed.replace("{error}", "addCommand exploded"));
		expect(shown.duration).toBe(0);
	});

	it("uses English for that notice when the settings were not even loaded", async () => {
		const app = new App();
		const plugin = new HealthSyncPlugin(app as never, { version: "0.11.1-test" } as never) as Loaded["plugin"];
		plugin.loadData = () => Promise.reject(new Error("cannot read data.json"));
		await expect(plugin.onload()).rejects.toThrow("cannot read data.json");
		expect(Notice.recorded.at(-1)!.message).toBe(en.noticeLoadFailed.replace("{error}", "cannot read data.json"));
	});

	it("names a thrown plain value too, and survives a Notice that cannot be shown", async () => {
		const app = new App();
		const plugin = new HealthSyncPlugin(app as never, { version: "0.11.1-test" } as never) as Loaded["plugin"];
		plugin.loadData = () => Promise.reject("plain failure");
		const NoticeClass = Notice as unknown as { prototype: object };
		void NoticeClass;
		await expect(plugin.onload()).rejects.toBe("plain failure");
		expect(Notice.recorded.at(-1)!.message).toContain("plain failure");
	});
});

describe("what's new", () => {
	const SEEN = "garmin-health-sync-whats-new-seen";
	beforeEach(() => { Modal.opened = []; Notice.recorded = []; });
	afterEach(() => { vi.restoreAllMocks(); });

	it("shows the notes of an update once the layout is ready, in the user's language, and records the version", async () => {
		const { app } = await load({ language: "de", dailyNoteFormat: "YYYY-MM-DD" }, undefined, "0.11.2");
		expect(Modal.opened).toHaveLength(0);
		app.workspace.layoutReady();
		await settle();
		expect(Modal.opened).toHaveLength(1);
		expect((Modal.opened[0] as unknown as { contentEl: HTMLElement }).contentEl.querySelector("h2")?.textContent).toBe(de.whatsNewTitle);
		expect(app.loadLocalStorage(SEEN)).toBe("0.11.2");
	});

	it("shows nothing on a fresh install and only records the version", async () => {
		const { app } = await load(null, undefined, "0.11.2");
		app.workspace.layoutReady();
		await settle();
		expect(Modal.opened).toHaveLength(0);
		expect(app.loadLocalStorage(SEEN)).toBe("0.11.2");
	});

	it("treats an empty data.json like a fresh install", async () => {
		const { app } = await load({}, undefined, "0.11.2");
		app.workspace.layoutReady();
		await settle();
		expect(Modal.opened).toHaveLength(0);
	});

	it("gives a restart hint instead of a window when Obsidian has been running for a while", async () => {
		const { app } = await load({ language: "en" }, undefined, "0.11.2");
		vi.spyOn(performance, "now").mockReturnValue(300_000);
		app.workspace.layoutReady();
		await vi.advanceTimersByTimeAsync(3000);
		await settle();
		expect(Modal.opened).toHaveLength(0);
		expect(Notice.messages()).toContain(en.noticeWhatsNewRestart.replace("{version}", "0.11.2"));
	});

	it("waits 3 seconds with its startup work when it is enabled while Obsidian is running, so an installer does not wait for it", async () => {
		const { app } = await load({ language: "en" }, undefined, "0.11.2");
		const hint = en.noticeWhatsNewRestart.replace("{version}", "0.11.2");
		vi.spyOn(performance, "now").mockReturnValue(300_000);
		app.workspace.layoutReady();
		await vi.advanceTimersByTimeAsync(2999);
		expect(Notice.messages()).not.toContain(hint);
		await vi.advanceTimersByTimeAsync(1);
		await settle();
		expect(Notice.messages()).toContain(hint);
	});

	it("does not start the startup work when the plugin is unloaded before the wait is over", async () => {
		const { app, plugin } = await load({ language: "en" }, undefined, "0.11.2");
		vi.spyOn(performance, "now").mockReturnValue(300_000);
		app.workspace.layoutReady();
		(plugin as unknown as { unload: () => void }).unload();
		await vi.advanceTimersByTimeAsync(5000);
		expect(Notice.messages()).not.toContain(en.noticeWhatsNewRestart.replace("{version}", "0.11.2"));
	});

	it("logs a failure to show the notes and keeps the plugin running", async () => {
		const { app } = await load({ language: "en" }, undefined, "0.11.2");
		app.saveLocalStorage = () => undefined;
		vi.spyOn(Modal.prototype, "open").mockImplementation(() => { throw new Error("no window"); });
		const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
		app.workspace.layoutReady();
		await settle();
		expect(error.mock.calls.some((c) => String(c[0]).includes("what's new failed"))).toBe(true);
	});

	it("opens the notes of the running line from the command", async () => {
		const { plugin } = await load({ language: "en" }, undefined, "0.11.2");
		plugin.commands.get("show-whats-new")!.callback!();
		expect(Modal.opened).toHaveLength(1);
	});
});

describe("birth year setting", () => {
	it("keeps a believable year and drops anything else from a hand-edited data.json", async () => {
		expect((await load({ birthYear: 1985 })).plugin.settings.birthYear).toBe(1985);
		expect((await load({ birthYear: 1850 })).plugin.settings.birthYear).toBeNull();
		expect((await load({ birthYear: "1985" as never })).plugin.settings.birthYear).toBe(1985);
		expect((await load(null)).plugin.settings.birthYear).toBeNull();
	});
});

describe("setting up from the notes on a fresh install", () => {
	const NOTES = (app: App): void => {
		for (const [path, fm] of Object.entries({ "Daily/2026-10-24.md": { ohs_steps: 8000, ohs_resting_hr: 52, ohs_hrv: 48, ohs_lifestyle_coffee: 3 }, "Daily/2026-10-23.md": { ohs_steps: 7000, ohs_hrv: 50, ohs_floors: 6 } })) {
			app.vault.seed(path, "---\n---\n");
			app.metadataCache.frontmatter.set(path, fm);
		}
	};

	it("takes the metrics, the prefix and the habits from the notes, switches the side panel on, saves and says so", async () => {
		const { app, plugin } = await load(null, NOTES, "0.12.0");
		app.workspace.layoutReady();
		await settle();
		expect(plugin.settings.panelEnabled).toBe(true);
		expect(plugin.settings.usePrefix).toBe(true);
		expect(plugin.settings.enabledMetrics["floors"]).toBe(true);
		expect(plugin.settings.enabledMetrics["lifestyle_log"]).toBe(true);
		expect(plugin.saves).toBeGreaterThan(0);
		expect((plugin.data as { usePrefix?: boolean }).usePrefix).toBe(true);
		expect(Notice.messages()).toContain(en.noticeDataDetected.replace("{count}", "2"));
	});

	it("says it in the plugin language", async () => {
		const { app } = await load(null, (a) => { NOTES(a); document.documentElement.lang = "de"; }, "0.12.0");
		app.workspace.layoutReady();
		await settle();
		expect(Notice.messages()).toContain(de.noticeDataDetected.replace("{count}", "2"));
	});

	it("leaves settings that were saved alone, whatever the notes hold", async () => {
		const { app, plugin } = await load({ language: "en", usePrefix: false, panelEnabled: false }, NOTES, "0.12.0");
		app.workspace.layoutReady();
		await settle();
		expect(plugin.settings.panelEnabled).toBe(false);
		expect(plugin.settings.usePrefix).toBe(false);
		expect(plugin.settings.enabledMetrics["floors"]).toBe(false);
		expect(Notice.messages()).not.toContain(en.noticeDataDetected.replace("{count}", "2"));
	});

	it("changes nothing when the notes hold no Garmin data", async () => {
		const { app, plugin } = await load(null, (a) => { a.vault.seed("Daily/2026-10-24.md", "x"); a.metadataCache.frontmatter.set("Daily/2026-10-24.md", { mood: "good" }); }, "0.12.0");
		const saves = plugin.saves;
		app.workspace.layoutReady();
		await settle();
		expect(plugin.settings.panelEnabled).toBe(false);
		expect(plugin.saves).toBe(saves);
		expect(Notice.messages().some((m) => m.includes("Found Garmin data"))).toBe(false);
	});

	it("looks once more when Obsidian has indexed the vault, and not a third time", async () => {
		const { app, plugin } = await load(null, undefined, "0.12.0");
		app.workspace.layoutReady();
		await settle();
		expect(plugin.settings.panelEnabled).toBe(false);
		// the metadata of the notes arrives after the first look
		NOTES(app);
		app.metadataCache.fire("resolved");
		await settle();
		expect(plugin.settings.panelEnabled).toBe(true);
		expect(Notice.messages()).toContain(en.noticeDataDetected.replace("{count}", "2"));
	});

	it("gives up after the second look and keeps looking at nothing after that", async () => {
		const { app, plugin } = await load(null, undefined, "0.12.0");
		app.workspace.layoutReady();
		await settle();
		app.metadataCache.fire("resolved");
		await settle();
		NOTES(app);
		app.metadataCache.fire("resolved");
		await settle();
		expect(plugin.settings.panelEnabled).toBe(false);
	});

	it("looks only once for settings that were saved, also after indexing", async () => {
		const { app, plugin } = await load({ language: "en" }, undefined, "0.12.0");
		app.workspace.layoutReady();
		await settle();
		NOTES(app);
		app.metadataCache.fire("resolved");
		await settle();
		expect(plugin.settings.panelEnabled).toBe(false);
	});
});

describe("the panel chooses its cards by data", () => {
	it("is on for a fresh install and for settings that have it on, and off for settings saved before it existed", async () => {
		expect((await load(null)).plugin.settings.panelAuto).toBe(true);
		expect((await load({ panelAuto: true })).plugin.settings.panelAuto).toBe(true);
		expect((await load({ panelAuto: false })).plugin.settings.panelAuto).toBe(false);
		expect((await load({ language: "en", panelEnabled: true, panelCards: { hrv: false } })).plugin.settings.panelAuto).toBe(false);
		expect(DEFAULT_SETTINGS.panelAuto).toBe(true);
	});

	it("keeps what a saved setup had: every card it did not switch off", async () => {
		const { plugin } = await load({ panelEnabled: true, panelCards: { hrv: false } });
		expect(plugin.settings.panelAuto).toBe(false);
		expect(plugin.settings.panelCards).toEqual({ hrv: false });
	});
});

describe("hidden habit settings", () => {
	it("keeps the saved keys of hidden habits, drops anything else and starts empty", async () => {
		const { plugin } = await load({ hiddenHabits: ["lifestyle_a", 5, "steps", "lifestyle_b"] } as never);
		expect(plugin.settings.hiddenHabits).toEqual(["lifestyle_a", "lifestyle_b"]);
		expect((await load({ hiddenHabits: "lifestyle_a" } as never)).plugin.settings.hiddenHabits).toEqual([]);
		expect((await load(null)).plugin.settings.hiddenHabits).toEqual([]);
		expect(DEFAULT_SETTINGS.hiddenHabits).toEqual([]);
	});
});

describe("lifestyle habit settings", () => {
	it("keeps the saved habits, drops entries that are no habits and reads an unknown kind as a yes or no", async () => {
		const { plugin } = await load({ lifestyleHabits: { lifestyle_a: { name: "A", kind: "count", last: "2026-10-24", id: "11" }, lifestyle_b: { name: "B", kind: "other", last: "yesterday", id: 12 }, other: { name: "C", kind: "check" }, lifestyle_d: { name: 4 }, lifestyle_e: null } } as never);
		expect(plugin.settings.lifestyleHabits).toEqual({ lifestyle_a: { name: "A", kind: "count", last: "2026-10-24", id: "11" }, lifestyle_b: { name: "B", kind: "check", last: "" } });
		const { plugin: fresh } = await load(null);
		expect(fresh.settings.lifestyleHabits).toEqual({});
		expect(DEFAULT_SETTINGS.lifestyleHabits).toEqual({});
	});
});

describe("panel card settings", () => {
	it("starts with no card switched off, and copies the saved ones instead of sharing the defaults", async () => {
		const { plugin } = await load(null);
		expect(plugin.settings.panelCards).toEqual({});
		plugin.settings.panelCards["hrv"] = false;
		expect(DEFAULT_SETTINGS.panelCards).toEqual({});
		const saved = { hrv: false };
		const { plugin: again } = await load({ panelCards: saved });
		expect(again.settings.panelCards).toEqual({ hrv: false });
		expect(again.settings.panelCards).not.toBe(saved);
	});
});

describe("health panel", () => {
	const PANEL = "garmin-health-panel";

	it("registers the view, the command and a ribbon icon", async () => {
		const { app, plugin } = await load(null);
		expect(app.workspace.viewFactories.has(PANEL)).toBe(true);
		expect(plugin.commands.get("open-health-panel")?.name).toBe(en.commandOpenPanel);
		expect((plugin as unknown as { ribbonIcons: { icon: string; title: string }[] }).ribbonIcons).toEqual([
			expect.objectContaining({ icon: "activity", title: en.commandOpenPanel }),
		]);
	});

	it("opens the panel from the ribbon icon", async () => {
		const { app, plugin } = await load({ panelEnabled: true });
		(plugin as unknown as { ribbonIcons: { callback: () => void }[] }).ribbonIcons[0]!.callback();
		await settle();
		expect(app.workspace.getLeavesOfType(PANEL)).toHaveLength(1);
	});

	it("switches the panel on and opens it when it is asked for, with nothing to turn on in the settings first, and keeps it on", async () => {
		const { app, plugin } = await load({ panelEnabled: false, language: "en" });
		const saves = plugin.saves;
		plugin.commands.get("open-health-panel")!.callback!();
		await settle();
		expect(plugin.settings.panelEnabled).toBe(true);
		expect(plugin.saves).toBe(saves + 1);
		expect((plugin.data as { panelEnabled?: boolean }).panelEnabled).toBe(true);
		expect(app.workspace.getLeavesOfType(PANEL)).toHaveLength(1);
		plugin.commands.get("open-health-panel")!.callback!();
		await settle();
		expect(plugin.saves).toBe(saves + 1);
		expect(app.workspace.getLeavesOfType(PANEL)).toHaveLength(1);
	});

	it("opens from the ribbon icon of a fresh install the same way", async () => {
		const { app, plugin } = await load(null);
		(plugin as unknown as { ribbonIcons: { callback: () => void }[] }).ribbonIcons[0]!.callback();
		await settle();
		expect(plugin.settings.panelEnabled).toBe(true);
		expect(app.workspace.getLeavesOfType(PANEL)).toHaveLength(1);
	});

	it("opens the panel in the right sidebar and reuses it on the next call", async () => {
		const { app, plugin } = await load({ panelEnabled: true });
		plugin.commands.get("open-health-panel")!.callback!();
		await settle();
		expect(app.workspace.getLeavesOfType(PANEL)).toHaveLength(1);
		expect(app.workspace.revealed).toHaveLength(1);
		plugin.commands.get("open-health-panel")!.callback!();
		await settle();
		expect(app.workspace.getLeavesOfType(PANEL)).toHaveLength(1);
		expect(app.workspace.revealed).toHaveLength(2);
	});

	it("does nothing when there is no right sidebar", async () => {
		const { app, plugin } = await load({ panelEnabled: true });
		app.workspace.rightLeafAvailable = false;
		await plugin.openPanel();
		expect(app.workspace.leaves).toHaveLength(0);
	});

	it("shows the panel once when switched on, but never on a phone", async () => {
		const { app, plugin } = await load({ panelEnabled: true });
		await plugin.applyPanelEnabled();
		expect(app.workspace.getLeavesOfType(PANEL)).toHaveLength(1);
		app.workspace.detachLeavesOfType(PANEL);
		Platform.isPhone = true;
		await plugin.applyPanelEnabled();
		expect(app.workspace.leaves).toHaveLength(0);
	});

	it("closes the panel when switched off", async () => {
		const { app, plugin } = await load({ panelEnabled: true });
		await plugin.openPanel();
		plugin.settings.panelEnabled = false;
		await plugin.applyPanelEnabled();
		expect(app.workspace.leaves).toHaveLength(0);
	});

	it("re-renders the open panel after a language change", async () => {
		const { app, plugin } = await load({ panelEnabled: true });
		await plugin.openPanel();
		plugin.settings.language = "de";
		plugin.refreshPanels();
		const view = app.workspace.getLeavesOfType(PANEL)[0]!.view!;
		expect(view.contentEl.textContent).toContain(de.panelNoReading);
	});

	it("skips leaves that are not the panel when refreshing", async () => {
		const { app, plugin } = await load({ panelEnabled: true });
		await plugin.openPanel();
		app.workspace.getLeavesOfType(PANEL)[0]!.view = null;
		expect(() => plugin.refreshPanels()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// The backfill command: one dialog, one notice, one run at a time
// ---------------------------------------------------------------------------

describe("the backfill command", () => {
	const historyLines = (app: App): string[] => app.vault.paths().filter((path) => path.includes("Garmin history")).flatMap((path) => app.vault.text(path).split("\n").filter((l) => /^\d{4}-/.test(l)));
	const openNotices = (): (typeof Notice.recorded)[number][] => Notice.recorded.filter((n) => n.fragment && !n.hidden);

	interface Choices {
		/** The first and the last day of the range, in days ago. */
		from?: number;
		to?: number;
		behaviour?: string;
		again?: boolean;
		until?: boolean;
	}

	/** Opens the dialog, makes the choices and starts. */
	function start(loaded: Awaited<ReturnType<typeof load>>, choices: Choices = {}): Modal {
		loaded.plugin.commands.get("backfill-health-data")!.callback!();
		const modal = Modal.opened.at(-1)!;
		const [from, to] = Array.from(modal.contentEl.querySelectorAll<HTMLInputElement>("input")).filter((i) => i.type === "date");
		const type = (input: HTMLInputElement, daysAgo: number): void => {
			input.value = dayString(daysAgo);
			input.dispatchEvent(new window.Event("input"));
		};
		type(from!, choices.from ?? 3);
		type(to!, choices.to ?? 1);
		const [until, again] = Array.from(modal.contentEl.querySelectorAll<HTMLInputElement>("input[type=checkbox]"));
		for (const [box, on] of [[until!, choices.until], [again!, choices.again]] as const) {
			if (!on) continue;
			box.checked = true;
			box.dispatchEvent(new window.Event("change"));
		}
		if (choices.behaviour) {
			const select = modal.contentEl.querySelector("select")!;
			select.value = choices.behaviour;
			select.dispatchEvent(new window.Event("change"));
		}
		(modal.contentEl.querySelector("button.mod-cta") as HTMLButtonElement).click();
		return modal;
	}

	it("is one command with a stable id, named in the user's language, and the old ones are gone", async () => {
		const { plugin } = await load(signedIn({ language: "de" }));
		expect(plugin.commands.get("backfill-health-data")?.name).toBe(de.commandBackfill);
		expect(plugin.commands.has("force-backfill-health-data")).toBe(false);
		expect(plugin.commands.has("build-history")).toBe(false);
	});

	it("opens a dialog with a date field each, the choice for days without a note from the setting, and two switches that are off", async () => {
		const loaded = await load(signedIn({ language: "en", missingNoteBehaviour: "history" }));
		loaded.plugin.commands.get("backfill-health-data")!.callback!();
		const modal = Modal.opened.at(-1)!;
		expect(modal.contentEl.querySelector("h2")?.textContent).toBe(en.modalBackfillTitle);
		const [from, to] = Array.from(modal.contentEl.querySelectorAll<HTMLInputElement>("input")).filter((i) => i.type === "date");
		expect([from!.value, to!.value]).toEqual([dayString(7), dayString(0)]);
		expect(modal.contentEl.querySelector("select")!.value).toBe("history");
		expect(Array.from(modal.contentEl.querySelectorAll<HTMLInputElement>("input[type=checkbox]")).map((c) => c.checked)).toEqual([false, false]);
	});

	it("pre-fills local dates, also late in the evening and just after midnight", async () => {
		for (const [h, m] of [[0, 30], [23, 30]] as const) {
			vi.setSystemTime(new Date(2026, 9, 25, h, m, 0));
			const loaded = await load(signedIn());
			loaded.plugin.commands.get("backfill-health-data")!.callback!();
			const [from, to] = Array.from(Modal.opened.at(-1)!.contentEl.querySelectorAll<HTMLInputElement>("input")).filter((i) => i.type === "date");
			expect([from!.value, to!.value], `${h}:${m}`).toEqual(["2026-10-18", "2026-10-25"]);
		}
	});

	it("asks to sign in first when there is no session, without opening the dialog", async () => {
		const loaded = await load(signedIn());
		loaded.provider.configured = false;
		const before = Modal.opened.length;
		loaded.plugin.commands.get("backfill-health-data")!.callback!();
		expect(Modal.opened.length).toBe(before);
		expect(Notice.recorded.at(-1)?.message).toBe(en.noticeLoginRequired);
	});

	it("fetches the chosen days newest first, shows progress and a status bar item, and ends with a summary", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		const modal = start(loaded);
		await settle();
		expect(modal.isOpen).toBe(false);
		expect(loaded.plugin.statusBarItems).toHaveLength(1);
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toEqual([dayString(1), dayString(2), dayString(3)]);
		expect(loaded.app.vault.paths().filter((p) => /^\d{4}-/.test(p))).toHaveLength(3);
		expect(loaded.plugin.statusBarItems[0]!.isConnected).toBe(false);
		expect(Notice.recorded.at(-1)?.message).toBe("Backfill done: 3 days fetched, 0 were already there");
		expect(loaded.plugin.saves).toBeGreaterThan(0);
	});

	it("goes on where it left off: complete days are not fetched again, unless the switch says so", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		start(loaded, { from: 10, to: 8 });
		await vi.runAllTimersAsync();
		loaded.provider.fetchCalls = [];
		start(loaded, { from: 11, to: 8 });
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toEqual([dayString(11)]);
		loaded.provider.fetchCalls = [];
		start(loaded, { from: 10, to: 8, again: true });
		await vi.runAllTimersAsync();
		expect(fetched(loaded.provider)).toEqual([dayString(8), dayString(9), dayString(10)]);
	});

	it("follows the choice of the dialog for days without a note, not the setting", async () => {
		const loaded = await load(signedIn({ missingNoteBehaviour: "create" }));
		start(loaded, { behaviour: "history" });
		await vi.runAllTimersAsync();
		expect(historyLines(loaded.app)).toHaveLength(3);
		expect(loaded.app.vault.paths().filter((p) => /^\d{4}-/.test(p))).toEqual([]);
		expect(loaded.plugin.settings.missingNoteBehaviour).toBe("create");
	});

	it("keeps the choices of a run that goes back until the data starts, as the job that a restart would resume", async () => {
		const loaded = await load(signedIn());
		loaded.provider.gate = new Promise(() => undefined);
		start(loaded, { until: true, behaviour: "history", again: true });
		await settle();
		expect(loaded.plugin.data).toMatchObject({ backfillJob: { from: dayString(1825), to: dayString(1), force: true, untilStart: true, behaviour: "history" } });
	});

	it("does not start a second backfill from a second dialog that was open at the same time", async () => {
		const loaded = await load(signedIn());
		loaded.provider.gate = new Promise<void>(() => undefined);
		loaded.plugin.commands.get("backfill-health-data")!.callback!();
		loaded.plugin.commands.get("backfill-health-data")!.callback!();
		for (const modal of Modal.opened.slice(-2)) (modal.contentEl.querySelector("button.mod-cta") as HTMLButtonElement).click();
		await settle();
		expect(loaded.plugin.statusBarItems).toHaveLength(1);
		expect(openNotices()).toHaveLength(1);
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeBackfillRunning);
	});

	it("shows the running backfill instead of opening a dialog, and leaves the recent days to the auto-sync", async () => {
		const loaded = await load(signedIn(), (app) => void app.vault.seed(`${dayString(0)}.md`, "---\n---\ntext"));
		let release: () => void = () => undefined;
		loaded.provider.gate = new Promise<void>((resolve) => (release = resolve));
		start(loaded);
		await settle();
		const dialogs = Modal.opened.length;
		loaded.plugin.commands.get("backfill-health-data")!.callback!();
		expect(Modal.opened.length).toBe(dialogs);
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeBackfillRunning);
		loaded.app.workspace.fire("file-open", loaded.app.vault.getMarkdownFiles()[0]!);
		await settle();
		expect(loaded.provider.fetchCalls).toHaveLength(1);
		release();
		await vi.runAllTimersAsync();
	});

	it("stops from the button of the notice and says where it stopped", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		start(loaded, { from: 10 });
		await settle();
		(openNotices()[0]!.fragment!.querySelector("button") as HTMLButtonElement).click();
		await vi.runAllTimersAsync();
		expect(Notice.recorded.at(-1)?.message).toBe(`Backfill stopped at ${dayString(2)}. Run it again to continue.`);
		expect(fetched(loaded.provider)).toEqual([dayString(1)]);
		expect(loaded.plugin.settings.backfillJob).toBeNull();
	});

	it("signs in first when the session has to be renewed, and says so when that fails", async () => {
		const loaded = await load(signedIn());
		loaded.provider.oauth1 = null;
		loaded.provider.authResult = { ok: false, cancelled: false };
		start(loaded);
		await vi.runAllTimersAsync();
		expect(loaded.provider.authCalls).toBe(1);
		expect(fetched(loaded.provider)).toEqual([]);
		expect(Notice.recorded.at(-1)?.message).toBe(en.noticeLoginRequired);
		expect(loaded.plugin.statusBarItems[0]!.isConnected).toBe(false);
	});

	it("goes on after a successful sign-in", async () => {
		const loaded = await load(signedIn());
		loaded.provider.oauth1 = null;
		start(loaded, { from: 2 });
		await vi.runAllTimersAsync();
		expect(loaded.provider.authCalls).toBe(1);
		expect(fetched(loaded.provider)).toHaveLength(2);
	});

	it("tells the user to sign in when the token dies during the run, and keeps the days already done", async () => {
		const loaded = await load(signedIn({ language: "en" }));
		loaded.provider.byDate.set(dayString(2), new LoginRequiredError());
		start(loaded);
		await vi.runAllTimersAsync();
		expect(Notice.recorded.map((n) => n.message)).toContain(en.noticeLoginRequired);
		expect(fetched(loaded.provider)).toEqual([dayString(1), dayString(2)]);
	});

	it("reports days that could not be stored and frees the command again", async () => {
		const loaded = await load(signedIn());
		loaded.app.vault.failOn = (op) => (op === "create" ? new Error("disk full") : null);
		start(loaded, { from: 2, behaviour: "history" });
		await vi.runAllTimersAsync();
		// the days that could not be stored are failed days, left for the next run (not marked as fetched)
		expect(Notice.recorded.map((n) => n.message).some((m) => m.includes("failed. Run the backfill again"))).toBe(true);
		expect(loaded.plugin.statusBarItems[0]!.isConnected).toBe(false);
		loaded.app.vault.failOn = null;
		const dialogs = Modal.opened.length;
		loaded.plugin.commands.get("backfill-health-data")!.callback!();
		expect(Modal.opened.length).toBe(dialogs + 1);
		const file = loaded.app.vault.seed(`${dayString(2)}.md`, "x");
		loaded.app.workspace.fire("file-open", file);
		await vi.runAllTimersAsync();
		expect(loaded.plugin.saves).toBeGreaterThan(0);
	});

	it("shows no status bar item on a phone, where the command brings the notice back", async () => {
		Platform.isDesktop = false;
		try {
			const loaded = await load(signedIn({ language: "en" }));
			loaded.provider.gate = new Promise(() => undefined);
			start(loaded);
			await settle();
			expect(loaded.plugin.statusBarItems).toHaveLength(0);
			expect(openNotices()).toHaveLength(1);
		} finally {
			Platform.isDesktop = true;
		}
	});

	describe("the progress command", () => {
		const progress = (loaded: Awaited<ReturnType<typeof load>>) => loaded.plugin.commands.get("show-progress")!;

		it("is listed only while a backfill runs, and brings the dismissed notice back", async () => {
			const loaded = await load(signedIn({ language: "en" }));
			expect(progress(loaded).checkCallback!(true)).toBe(false);
			expect(progress(loaded).checkCallback!(false)).toBe(false);
			loaded.provider.gate = new Promise(() => undefined);
			start(loaded);
			await settle();
			expect(progress(loaded).checkCallback!(true)).toBe(true);
			openNotices()[0]!.hidden = true;
			expect(openNotices()).toHaveLength(0);
			expect(progress(loaded).checkCallback!(false)).toBe(true);
			expect(openNotices()).toHaveLength(1);
		});

		it("is also brought back by a click on the status bar item", async () => {
			const loaded = await load(signedIn({ language: "en" }));
			loaded.provider.gate = new Promise(() => undefined);
			start(loaded);
			await settle();
			openNotices()[0]!.hidden = true;
			loaded.plugin.statusBarItems[0]!.click();
			expect(openNotices()).toHaveLength(1);
		});
	});

	describe("the job that a restart resumes", () => {
		it("is kept while the backfill runs and dropped when it ends", async () => {
			const loaded = await load(signedIn({ language: "en" }));
			loaded.provider.gate = new Promise(() => undefined);
			start(loaded);
			await settle();
			expect(loaded.plugin.data).toMatchObject({ backfillJob: { from: dayString(3), to: dayString(1), force: false, untilStart: false, behaviour: "create" } });
			const done = await load(signedIn({ language: "en" }));
			start(done);
			await vi.runAllTimersAsync();
			expect(done.plugin.settings.backfillJob).toBeNull();
			expect(done.plugin.data).toMatchObject({ backfillJob: null });
		});

		it("moves on while it runs, to the next day that is still to do", async () => {
			const loaded = await load(signedIn({ language: "en" }));
			let release: () => void = () => undefined;
			loaded.provider.onFetch = (date) => {
				if (date === dayString(6)) loaded.provider.gate = new Promise<void>((resolve) => (release = resolve));
			};
			start(loaded, { from: 12, to: 1 });
			await vi.advanceTimersByTimeAsync(60_000);
			expect(loaded.plugin.settings.backfillJob).toMatchObject({ from: dayString(12), to: dayString(6) });
			expect(loaded.plugin.data).toMatchObject({ backfillJob: { to: dayString(6) } });
			release();
			await vi.runAllTimersAsync();
		});

		it("is kept when Obsidian closes the plugin mid-run, and goes on from there, with the notice, at the next start", async () => {
			const first = await load(signedIn({ language: "en" }));
			first.provider.onFetch = (date) => {
				if (date === dayString(8)) first.plugin.onunload();
			};
			start(first, { from: 12, to: 5 });
			await vi.runAllTimersAsync();
			expect(fetched(first.provider)).toEqual([dayString(5), dayString(6), dayString(7), dayString(8)]);
			const saved = first.plugin.data as { backfillJob: unknown };
			expect(saved.backfillJob).toMatchObject({ from: dayString(12), force: false });

			Notice.recorded.length = 0;
			const second = await load(saved as never);
			second.app.workspace.layoutReady();
			await vi.advanceTimersByTimeAsync(9_000);
			expect(second.provider.fetchCalls.filter((c) => c.date <= dayString(5))).toEqual([]);
			await vi.runAllTimersAsync();
			expect(fetched(second.provider)).toEqual(expect.arrayContaining([dayString(12)]));
			expect(Notice.recorded.some((n) => n.fragment)).toBe(true);
			expect(second.plugin.settings.backfillJob).toBeNull();
		});

		it("is not started when the plugin is closed again before it is due", async () => {
			const loaded = await load(signedIn({ backfillJob: { from: dayString(4), to: dayString(3), force: false, untilStart: false, behaviour: "create" } }));
			loaded.app.workspace.layoutReady();
			loaded.plugin.unload();
			await vi.advanceTimersByTimeAsync(20_000);
			expect(Notice.recorded.filter((n) => n.fragment)).toEqual([]);
		});

		it("takes the job that is stored when it is due: a run that was started and finished meanwhile has cleared it", async () => {
			const loaded = await load(signedIn({ backfillJob: { from: dayString(4), to: dayString(3), force: false, untilStart: false, behaviour: "create" } }));
			loaded.app.workspace.layoutReady();
			loaded.plugin.settings.backfillJob = null;
			await vi.advanceTimersByTimeAsync(20_000);
			expect(Notice.recorded.filter((n) => n.fragment)).toEqual([]);
		});

		it("keeps the choices of a saved job", async () => {
			const job = { from: "2026-10-23", to: "2026-10-24", force: true, untilStart: true, behaviour: "history" } as const;
			expect((await load(signedIn({ backfillJob: job }))).plugin.settings.backfillJob).toEqual(job);
		});

		it("takes the setting for a saved job without a valid choice, and ignores one that is not a range of days", async () => {
			const fromOld = await load(signedIn({ missingNoteBehaviour: "skip", backfillJob: { from: "2026-10-23", to: "2026-10-24", force: false } as never }));
			expect(fromOld.plugin.settings.backfillJob).toEqual({ from: "2026-10-23", to: "2026-10-24", force: false, untilStart: false, behaviour: "skip" });
			for (const job of [{ from: "x", to: "2026-10-24" }, { from: "2026-10-25", to: "2026-10-24" }, "junk", null]) {
				expect((await load({ backfillJob: job as never })).plugin.settings.backfillJob).toBeNull();
			}
		});
	});
});

describe("races between the sync and the rest of the plugin", () => {
	it("does not start an auto-sync while a backfill is starting (its flag is set before it has a run)", async () => {
		const loaded = await load(signedIn());
		(loaded.plugin as unknown as { backfillRunning: boolean }).backfillRunning = true;
		await (loaded.plugin as unknown as { tryAutoSync(): Promise<void> }).tryAutoSync();
		expect(loaded.provider.fetchCalls).toEqual([]);
	});

	it("catches up when the app comes back to the front, not when it goes away", async () => {
		const loaded = await load(signedIn());
		loaded.app.workspace.layoutReady();
		await vi.advanceTimersByTimeAsync(60_000);
		const attempt = vi.spyOn(loaded.plugin as unknown as { tryAutoSync(): Promise<void> }, "tryAutoSync");
		const state = vi.spyOn(document, "visibilityState", "get");
		state.mockReturnValue("hidden");
		document.dispatchEvent(new window.Event("visibilitychange"));
		expect(attempt).not.toHaveBeenCalled();
		state.mockReturnValue("visible");
		document.dispatchEvent(new window.Event("visibilitychange"));
		expect(attempt).toHaveBeenCalledTimes(1);
		loaded.plugin.unload();
		document.dispatchEvent(new window.Event("visibilitychange"));
		expect(attempt).toHaveBeenCalledTimes(1);
		state.mockRestore();
	});

	it("writes nothing more once the plugin is closed in the middle of an auto-sync", async () => {
		const loaded = await load(signedIn());
		loaded.provider.onFetch = () => loaded.plugin.onunload();
		loaded.app.workspace.layoutReady();
		await vi.runAllTimersAsync();
		expect(loaded.provider.fetchCalls).toHaveLength(1);
	});

	it("takes the sign-in notice away when the plugin is closed, because its button would call a plugin that is gone", async () => {
		const loaded = await load({});
		loaded.app.workspace.layoutReady();
		await settle();
		const notice = Notice.recorded.find((n) => n.fragment);
		expect(notice?.hidden).toBeFalsy();
		loaded.plugin.onunload();
		expect(notice?.hidden).toBe(true);
	});
});

describe("the card order", () => {
	it("keeps the saved order, drops anything that is not an id, and does not share it with the defaults", async () => {
		const { plugin } = await load({ panelOrder: ["steps", 5 as never, "hrv"] });
		expect(plugin.settings.panelOrder).toEqual(["steps", "hrv"]);
		plugin.settings.panelOrder.push("sleep");
		expect((await load(null)).plugin.settings.panelOrder).toEqual([]);
	});
});
