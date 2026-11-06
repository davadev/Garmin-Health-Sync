import type { App } from "obsidian";
import { dateFromDailyNote } from "../daily-note";
import { parseClock, parseDuration } from "./parse";
import type { HistoryStore } from "../history/store";
import { parseSessions, type Session } from "./sessions";
import { LIFESTYLE_PREFIX, type HabitInfo } from "../providers/garmin/lifestyle";
import { METRICS } from "../metrics";

/** Frontmatter prefix the sync adds when "use prefix" is on. Notes of both kinds can sit in one vault. */
const PREFIX = "ohs_";
const GARMIN_KEYS = new Set([...METRICS.map((m) => m.key), "distance_mi", "weight_lbs"]);

/** What the panel found in the vault: how many daily notes, how many of them hold Garmin properties, and which ones the newest of those holds. */
export interface NotesOverview {
	notes: number;
	withData: number;
	newest: string | null;
	newestWithData: string | null;
	/** The Garmin properties of the newest note that holds any (names of our own metrics only), and how many others it has. */
	keys: string[];
	otherKeys: number;
}

export interface IndexSettings {
	dailyNotePath: string;
	dailyNoteFormat: string;
}

/** The properties of two notes of one day: a value the first has stays, a blank one is filled from the second. */
function mergeFrontmatter(first: Record<string, unknown>, second: Record<string, unknown>): Record<string, unknown> {
	const merged = { ...first };
	for (const [key, value] of Object.entries(second)) {
		const own = merged[key];
		if (own === undefined || own === null || own === "") merged[key] = value;
	}
	return merged;
}

/**
 * Daily-note frontmatter by date, read from Obsidian's metadata cache only (no Garmin calls), with the history
 * notes as a second source for a day without a note or a value the note lacks (the note wins per value).
 * Built lazily on first use and rebuilt after `invalidate()`; one pass over the vault is a few milliseconds.
 */
export class DayIndex {
	private days = new Map<string, Record<string, unknown>>();
	private built = false;

	constructor(private readonly app: App, private readonly settings: () => IndexSettings, private readonly history: HistoryStore | null = null) {}

	/** Changes with every invalidation or touch: what was worked out from the index is out of date when it differs. */
	private revision = 0;
	private sessionCache = new Map<string, Session[]>();

	get version(): number {
		return this.revision;
	}

	invalidate(): void {
		this.built = false;
		this.touch();
	}

	/** The history that the index reads from changed, the notes did not. */
	touch(): void {
		this.revision++;
		this.sessionCache.clear();
	}

	/** The numeric value of a metric on a day, or null when the note, the key or a finite number is missing. */
	value(key: string, date: string): number | null {
		const v = this.raw(key, date);
		// a number typed into a text property ("8000") is read as the number it says
		const n = typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : v;
		return typeof n === "number" && Number.isFinite(n) ? n : null;
	}

	/** Whether the day has a value for the key, of any kind (a number, a duration, a text): what decides if a card has anything to show. */
	has(key: string, date: string): boolean {
		const v = this.raw(key, date);
		return v !== undefined && v !== null && v !== "";
	}

	/** A duration metric ("6h 13min") on a day in minutes, or null. */
	minutes(key: string, date: string): number | null {
		return parseDuration(this.raw(key, date));
	}

	/** Whether a daily note exists for the day (even one without data). */
	hasNote(date: string): boolean {
		this.build();
		return this.days.has(date);
	}

	/** What the panel found in the notes: for the hint when there is nothing to show, and for the diagnostics. */
	overview(): NotesOverview {
		this.build();
		const garminKeys = (fm: Record<string, unknown>): string[] => Object.entries(fm).filter(([k, v]) => GARMIN_KEYS.has(k.startsWith(PREFIX) ? k.slice(PREFIX.length) : k) && v !== null && v !== undefined && v !== "").map(([k]) => k);
		const dates = [...this.days.keys()].sort();
		const withData = dates.filter((d) => garminKeys(this.days.get(d)!).length > 0);
		const latest = withData[withData.length - 1] ?? null;
		const keys = latest === null ? [] : garminKeys(this.days.get(latest)!);
		return { notes: dates.length, withData: withData.length, newest: dates[dates.length - 1] ?? null, newestWithData: latest, keys, otherKeys: latest === null ? 0 : Object.keys(this.days.get(latest)!).length - keys.length };
	}

	/** Whether any daily note was recognised, or any day is in the history: false means the panel has nothing to show at all. */
	hasAnyDay(): boolean {
		this.build();
		return this.days.size > 0 || !(this.history?.empty ?? true);
	}

	private datesCache: { revision: number; dates: string[] } | null = null;

	/** Every day with a note or a history record, oldest first. */
	dates(): string[] {
		this.build();
		if (this.datesCache?.revision === this.revision) return this.datesCache.dates;
		const all = new Set(this.days.keys());
		this.history?.forEachRecord((date) => all.add(date));
		const dates = [...all].sort();
		this.datesCache = { revision: this.revision, dates };
		return dates;
	}

	/** Whether the day has a note or a history record. */
	hasDay(date: string): boolean {
		return this.hasNote(date) || (this.history?.has(date) ?? false);
	}

	/** The day's sessions; empty for a day without sessions. A note's own entries win over the history's. */
	sessions(date: string): Session[] {
		this.build();
		let sessions = this.sessionCache.get(date);
		if (!sessions) {
			sessions = parseSessions({ ...this.history?.get(date), ...this.days.get(date) });
			this.sessionCache.set(date, sessions);
		}
		return sessions;
	}

	/** A text metric of the day, or null. */
	text(key: string, date: string): string | null {
		const v = this.raw(key, date);
		return typeof v === "string" && v.trim() !== "" ? v : null;
	}

	/** The place name of the day's first GPS workout, if the sync wrote one. */
	location(date: string): string | null {
		return this.text("workout_location", date);
	}

	/** A clock time ("23:15") on a day in minutes since midnight, or null. */
	clock(key: string, date: string): number | null {
		return parseClock(this.raw(key, date));
	}

	/**
	 * The habits of the lifestyle log that the notes and the history hold, found by their `lifestyle_` keys: what the panel
	 * can name without Garmin's answer (a device that was never signed in). The name is made from the key, a habit with an
	 * amount above 1 is a counted one, and `last` is the latest day with an entry.
	 */
	habitsInNotes(): Record<string, HabitInfo> {
		this.build();
		const found = new Map<string, { last: string; max: number }>();
		const take = (date: string, record: Record<string, unknown>): void => {
			for (const [raw, value] of Object.entries(record)) {
				const key = raw.startsWith(PREFIX) ? raw.slice(PREFIX.length) : raw;
				if (!key.startsWith(LIFESTYLE_PREFIX) || key === LIFESTYLE_PREFIX || typeof value !== "number" || !Number.isFinite(value)) continue;
				const seen = found.get(key) ?? { last: "", max: 0 };
				found.set(key, { last: date > seen.last ? date : seen.last, max: Math.max(seen.max, value) });
			}
		};
		for (const [date, fm] of this.days) take(date, fm);
		this.history?.forEachRecord(take);
		const habits: Record<string, HabitInfo> = {};
		for (const [key, seen] of found) {
			const words = key.slice(LIFESTYLE_PREFIX.length).replace(/_+/g, " ").trim();
			habits[key] = { name: words.charAt(0).toUpperCase() + words.slice(1), kind: seen.max > 1 ? "count" : "check", last: seen.last };
		}
		return habits;
	}

	/** The frontmatter value under the plain or the prefixed key. */
	private raw(key: string, date: string): unknown {
		this.build();
		const fm = this.days.get(date);
		// an empty property in the note (a template left it blank) is no value: the history record may have it
		const own = fm?.[key] ?? fm?.[PREFIX + key];
		return own === undefined || own === null || own === "" ? this.history?.get(date)?.[key] : own;
	}

	private build(): void {
		if (this.built) return;
		this.built = true;
		this.days = new Map();
		const settings = this.settings();
		for (const file of this.app.vault.getMarkdownFiles()) {
			if (this.history?.isHistoryFile(file)) continue;
			const date = dateFromDailyNote(file, settings);
			const fm = date ? this.app.metadataCache.getFileCache(file)?.frontmatter : undefined;
			if (!date || !fm) continue;
			// two notes of one day (an archive copy, a template named by date): what one lacks the other may hold
			const other = this.days.get(date);
			this.days.set(date, other ? mergeFrontmatter(other, fm) : fm);
		}
	}
}
