// The screenshots of the documentation: which cards, which day, which theme. Scene ids and file names are stable
// because README.md and the what's new window refer to them. Add a scene here and run `npm run screenshots`.
export interface Scene {
	id: string;
	/** "panel" renders the side panel; "whats-new" renders the what's new window of the running minor line. */
	kind?: "panel" | "whats-new";
	/** Width of the image in CSS px (default IMAGE_WIDTH). */
	width?: number;
	/** Image file in docs/screenshots. */
	file: string;
	theme: "light" | "dark";
	language: string;
	/** The day shown: this many days before the last day of the synthetic series (0 is the story day, a morning with a low HRV). */
	daysBack: number;
	/** The cards shown, in the panel's order. */
	cards: string[];
	/** The card whose light bulb is opened (the panel opens one at a time). */
	open: string[];
	/** Selectors that must exist in the rendered scene, so a renamed class fails the check instead of giving a wrong image. */
	expect: string[];
}

/** One width for every image, as the playbook asks: about the width of a side panel. */
export const IMAGE_WIDTH = 460;

export const SCENES: Scene[] = [
	{
		id: "whats-new",
		kind: "whats-new",
		width: 620,
		file: "whats-new.png",
		theme: "light",
		language: "en",
		daysBack: 0,
		cards: [],
		open: [],
		expect: [".ghs-whats-new-figure", ".ghs-fig-frame", ".ghs-fig-panel", ".ghs-insight", ".ghs-fig-compare", ".ghs-fig-notice", ".ghs-fig-command"],
	},
	{
		id: "panel-today",
		file: "panel-today.png",
		theme: "light",
		language: "en",
		daysBack: 7,
		cards: ["today", "hrv", "resting_hr", "spo2", "respiration_rate"],
		open: [],
		expect: [".ghs-readiness-bar", ".ghs-range-labelled", ".ghs-hrvweek"],
	},
	{
		id: "panel-today-dark",
		file: "panel-today-dark.png",
		theme: "dark",
		language: "en",
		daysBack: 7,
		cards: ["today", "hrv", "resting_hr", "spo2", "respiration_rate"],
		open: [],
		expect: [".ghs-readiness-bar", ".ghs-hrvweek"],
	},
	{
		id: "panel-sleep",
		file: "panel-sleep.png",
		theme: "light",
		language: "en",
		daysBack: 7,
		cards: ["sleep", "stages"],
		open: [],
		expect: [".ghs-card"],
	},
	{
		id: "panel-energy",
		file: "panel-energy.png",
		theme: "light",
		language: "en",
		daysBack: 7,
		cards: ["battery", "stress", "hydration"],
		open: [],
		expect: [".ghs-hydration-bar", ".ghs-split"],
	},
	{
		id: "panel-training",
		file: "panel-training.png",
		theme: "light",
		language: "en",
		daysBack: 7,
		cards: ["steps", "load", "weekly", "sessions"],
		open: [],
		expect: [".ghs-weekly", ".ghs-trend"],
	},
	{
		id: "panel-insights",
		file: "panel-insights.png",
		theme: "light",
		language: "en",
		daysBack: 0,
		cards: ["hrv", "resting_hr"],
		open: ["resting_hr"],
		expect: [".ghs-insight", ".ghs-insight-watch", ".ghs-about"],
	},
	{
		id: "panel-hydration",
		file: "panel-hydration.png",
		theme: "light",
		language: "en",
		daysBack: 1,
		cards: ["hydration", "stress"],
		open: ["hydration"],
		expect: [".ghs-hydration-bar", ".ghs-insight-watch"],
	},
];
