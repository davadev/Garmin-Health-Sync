// Why it matters: a fresh install should show the cards that can show something, not a wall of "no reading", while a
// person who already uses the panel must never lose a card they had. A card they switched on stays, one they switched off stays off.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App, WorkspaceLeaf } from "../testUtils/mocks/obsidian";
import { seedHistory } from "../testUtils/fakeHistory";
import { HealthPanelView } from "../src/panel/view";
import { PANEL_CARDS, cardHasData } from "../src/panel/cards";
import { DayIndex } from "../src/panel/index";
import { DEFAULT_SETTINGS, type HealthSyncSettings } from "../src/settings";
import { en } from "../src/i18n/en";

const TODAY = "2026-10-22";
const settings = { dailyNotePath: "", dailyNoteFormat: "YYYY-MM-DD" };

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(2026, 9, 22, 12));
});

async function open(patch: Partial<HealthSyncSettings>, frontmatter: (ago: number) => Record<string, unknown> | null): Promise<HealthPanelView> {
	const app = new App();
	await seedHistory(app, { end: TODAY, days: 40, frontmatter });
	const view = new HealthPanelView(new WorkspaceLeaf(app) as never, { settings: { ...DEFAULT_SETTINGS, panelCards: {}, ...patch } } as never);
	await view.onOpen();
	return view;
}
const titles = (view: HealthPanelView): (string | null)[] => Array.from(view.contentEl.querySelectorAll(".ghs-card-title")).map((e) => e.textContent);
const WITH_DATA = (ago: number): Record<string, unknown> => ({ hrv: 50 + (ago % 3), steps: 8000 });

describe("a panel that chooses its cards by data", () => {
	it("shows the cards that have data and leaves out the others, in order", async () => {
		const view = await open({ panelAuto: true }, WITH_DATA);
		expect(titles(view)).toEqual([en.panelHrvTitle, en.panelStepsTitle]);
	});

	it("shows the Readiness card when its data is there: with or without HRV, or only Garmin's own readiness, and not for data it cannot use", async () => {
		const basics = (ago: number): Record<string, unknown> => ({ resting_hr: 52 + (ago % 3), sleep_duration: "7h 10min", steps: 8000 });
		expect(titles(await open({ panelAuto: true }, (ago) => ({ ...basics(ago), hrv: 50 })))).toContain(en.panelTodayTitle);
		expect(titles(await open({ panelAuto: true }, basics))).toContain(en.panelTodayTitle);
		expect(titles(await open({ panelAuto: true }, (ago) => ({ training_readiness: 60 + ago, steps: 8000 })))).toContain(en.panelTodayTitle);
		expect(titles(await open({ panelAuto: true }, WITH_DATA))).not.toContain(en.panelTodayTitle);
	});

	it("shows every card in a panel that was set up before, whatever data there is", async () => {
		expect(titles(await open({ panelAuto: false }, WITH_DATA))).toHaveLength(PANEL_CARDS.length);
	});

	it("keeps a card the user switched on, and never shows one the user switched off", async () => {
		const view = await open({ panelAuto: true, panelCards: { sleep: true, hrv: false } }, WITH_DATA);
		expect(titles(view)).toEqual([en.panelSleepTitle, en.panelStepsTitle]);
	});

	it("shows all cards when none has data, so the panel is never blank, but still not the switched-off ones", async () => {
		const view = await open({ panelAuto: true, panelCards: { hrv: false } }, () => ({ mood: "ok" }));
		expect(titles(view)).toHaveLength(PANEL_CARDS.length - 1);
		expect(titles(view)).not.toContain(en.panelHrvTitle);
	});

	it("takes a card in as soon as its metric has a value, also a duration or a text, and drops its section header with it", async () => {
		const view = await open({ panelAuto: true }, (ago) => (ago === 3 ? { sleep_duration: "7h 10min", training_status: "PRODUCTIVE", hrv: 50 } : { hrv: 50 }));
		expect(titles(view)).toEqual([en.panelHrvTitle, en.panelSleepTitle]);
		const sections = Array.from(view.contentEl.querySelectorAll(".ghs-section")).map((e) => e.textContent);
		expect(sections).toEqual([en.panelSectionRecovery, en.panelSectionSleep]);
	});

	it("shows the cards that read workouts when a workout is there", async () => {
		const view = await open({ panelAuto: true }, (ago) => (ago === 2 ? { hrv: 50, running: "30min · Ø150 bpm" } : { hrv: 50 }));
		expect(titles(view)).toEqual(expect.arrayContaining([en.panelLoadTitle, en.panelWeeklyTitle, en.panelSessionsTitle]));
	});

	it("shows the Habits card when habits are in the notes or were sent by Garmin", async () => {
		expect(titles(await open({ panelAuto: true }, (ago) => ({ hrv: 50, lifestyle_run: ago % 2 })))).toContain(en.panelHabitsTitle);
		const saved = await open({ panelAuto: true, lifestyleHabits: { lifestyle_run: { name: "Run", kind: "check", last: TODAY } } }, WITH_DATA);
		expect(titles(saved)).toContain(en.panelHabitsTitle);
		expect(titles(await open({ panelAuto: true }, WITH_DATA))).not.toContain(en.panelHabitsTitle);
	});

	it("keeps the cards the same while looking at another day, and takes data from the last 90 days only", async () => {
		const view = await open({ panelAuto: true }, (ago) => (ago > 30 ? { sleep_duration: "7h 0min", hrv: 50 } : { hrv: 50 }));
		expect(titles(view)).toContain(en.panelSleepTitle);
		const old = await open({ panelAuto: true }, (ago) => (ago === 39 ? { hrv: 50, floors: 4 } : { hrv: 50 }));
		expect(titles(old)).toContain(en.panelFloorsTitle);
		const none = new DayIndex(new App() as never, () => settings);
		const floors = PANEL_CARDS.find((c) => c.id === "floors")!;
		expect(cardHasData(floors, none, TODAY, {})).toBe(false);
	});

	it("ignores blank properties of a template", async () => {
		const view = await open({ panelAuto: true }, () => ({ hrv: 50, steps: "", floors: null, spo2: undefined }));
		expect(titles(view)).toEqual([en.panelHrvTitle]);
	});
});

describe("DayIndex.has", () => {
	it("is true for a value of any kind and false for none, a blank or a null", async () => {
		const app = new App();
		await seedHistory(app, { end: TODAY, days: 1, frontmatter: () => ({ hrv: 0, sleep_duration: "7h", training_status: "X", steps: "", floors: null }) });
		const index = new DayIndex(app as never, () => settings);
		expect(["hrv", "sleep_duration", "training_status", "steps", "floors", "spo2"].map((k) => index.has(k, TODAY))).toEqual([true, true, true, false, false, false]);
		expect(index.has("hrv", "2020-01-01")).toBe(false);
	});
});
