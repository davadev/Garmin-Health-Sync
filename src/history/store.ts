import { normalizePath, type App, type TAbstractFile, type TFile, type TFolder } from "obsidian";
import { ensureFolderExists } from "../daily-note";
import { mergeRecord, parseMonth, sameRecord, serializeMonth, type DayRecord } from "./format";

export const HISTORY_FOLDER = "Garmin history";
/** History notes cannot be older than this: no Garmin device has data from before. */
const EARLIEST_MONTH = "2000-01";
const FILE_NAME = /^Garmin history (\d{4}-\d{2})(?!\d)/;

/** "2026-10" of a note name like "Garmin history 2026-10.md" (also of a sync conflict copy), or null. */
function monthOfName(name: string): string | null {
	return name.endsWith(".md") ? (FILE_NAME.exec(name)?.[1] ?? null) : null;
}

/** The months from the one of `from` to the one of `to`. */
function monthsBetween(from: string, to: string): string[] {
	const months: string[] = [];
	for (let month = from.slice(0, 7); month <= to.slice(0, 7); month = nextMonth(month)) months.push(month);
	return months;
}

function nextMonth(month: string): string {
	const [y, m] = month.split("-").map(Number) as [number, number];
	return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/**
 * The per-day history kept in the vault as one note per month ("Garmin history 2026-10.md", one JSON line per
 * day). Notes are plain markdown so every sync tool carries them. Reads fill an in-memory cache that the panel
 * then queries synchronously; writes are queued so two writers never race on one note.
 */
export class HistoryStore {
	/** Month to its days; a month without a note is cached as empty so it is not looked for again. */
	private cache = new Map<string, Map<string, DayRecord>>();
	private queue: Promise<unknown> = Promise.resolve();
	/** Counts every change of what a read could have seen (a write, a move, an invalidation): a read that started before it must not be cached. */
	private generation = 0;

	constructor(private readonly app: App, private readonly settings: { readonly dailyNotePath: string }) {}

	/** Whether a file or deleted file is a history note. */
	isHistoryFile(file: TAbstractFile): boolean {
		return monthOfName(file.name) !== null;
	}

	/** Months whose note changed after they were read: still served, until they are read again. */
	private stale = new Set<string>();

	/** Forget what was read: all of it, or the month of one changed note, which is read again but meanwhile still answers (the panel does not flash empty while a sync writes). */
	invalidate(file?: TAbstractFile): void {
		this.generation++;
		const month = file ? monthOfName(file.name) : null;
		if (month) this.stale.add(month);
		else {
			this.cache.clear();
			this.stale.clear();
		}
	}

	/** Whether every month from `from` to `to` has been read. */
	covers(from: string, to: string): boolean {
		return monthsBetween(from, to).every((month) => this.cache.has(month) && !this.stale.has(month));
	}

	/** Reads the months of a date range that are not cached yet; true when one of them has a note. */
	async warm(from: string, to: string): Promise<boolean> {
		const generation = this.generation;
		let found = false;
		// one look at the vault for all the months, not one per month, and the files sorted into their months in one pass
		const byMonth = new Map<string, TFile[]>();
		for (const file of this.app.vault.getMarkdownFiles()) {
			const month = monthOfName(file.name);
			if (month !== null) byMonth.set(month, [...(byMonth.get(month) ?? []), file]);
		}
		for (const month of monthsBetween(from, to)) {
			if (this.cache.has(month) && !this.stale.has(month)) continue;
			const days = new Map<string, DayRecord>();
			for (const file of this.ordered(byMonth.get(month) ?? [])) {
				found = true;
				for (const [date, record] of parseMonth(await this.app.vault.cachedRead(file))) days.set(date, mergeRecord(days.get(date), record));
			}
			// something changed while the note was being read: what was read may be out of date, so it is not kept
			if (generation === this.generation) {
				this.cache.set(month, days);
				this.stale.delete(month);
			}
		}
		return found;
	}

	/** The month ("2022-03") of the oldest history note in the vault, or null without any. A note named for a year before Garmin Connect existed is a stray file, not history: reading from it would mean reading thousands of empty months. */
	firstMonth(): string | null {
		let first: string | null = null;
		for (const file of this.app.vault.getMarkdownFiles()) {
			const month = monthOfName(file.name);
			if (month !== null && month >= EARLIEST_MONTH && (first === null || month < first)) first = month;
		}
		return first;
	}

	/** Whether any day was read. */
	get empty(): boolean {
		for (const month of this.cache.values()) if (month.size > 0) return false;
		return true;
	}

	/** Every record that was read, by day. */
	forEachRecord(visit: (date: string, record: DayRecord) => void): void {
		for (const month of this.cache.values()) for (const [date, record] of month) visit(date, record);
	}

	/** The day's record from the cache, or null (also for a month that was not read). */
	get(date: string): DayRecord | null {
		return this.cache.get(date.slice(0, 7))?.get(date) ?? null;
	}

	has(date: string): boolean {
		return this.get(date) !== null;
	}

	/** Adds or merges one day. */
	async put(date: string, record: DayRecord): Promise<void> {
		await this.putMany(new Map([[date, record]]));
	}

	/** Adds or merges days, one write per month note. Safe to call while another write runs. */
	putMany(records: Map<string, DayRecord>): Promise<void> {
		const byMonth = new Map<string, Map<string, DayRecord>>();
		for (const [date, record] of records) {
			const month = date.slice(0, 7);
			if (!byMonth.has(month)) byMonth.set(month, new Map());
			byMonth.get(month)!.set(date, record);
		}
		const run = async (): Promise<void> => {
			await this.move();
			for (const [month, days] of byMonth) {
				await this.write(month, days);
				// a month that was read is brought up to date, so a build that checks the days it has is not told they are gone
				this.generation++;
				const cached = this.cache.get(month);
				if (cached) for (const [date, record] of days) cached.set(date, mergeRecord(cached.get(date), record));
			}
		};
		const result = this.queue.then(run);
		this.queue = result.catch(() => undefined);
		return result;
	}

	/** The notes of a month, the one in the history folder first. */
	private filesOf(month: string): TFile[] {
		return this.ordered(this.app.vault.getMarkdownFiles().filter((file) => monthOfName(file.name) === month));
	}

	/** The notes of one month, the one in the history folder first, then the one with the shortest path. */
	private ordered(files: TFile[]): TFile[] {
		const home = `${this.folder()}/`;
		return files.sort((a, b) => Number(b.path.startsWith(home)) - Number(a.path.startsWith(home)) || a.path.length - b.path.length);
	}

	/**
	 * Brings history notes that lie anywhere else in the vault into the history folder of the daily notes folder, so a
	 * changed daily notes folder (a new year's subfolder, say) does not strand them: they are moved, never fetched again.
	 * A note whose place is taken stays where it is (it is merged when read). Returns how many were moved.
	 */
	relocate(): Promise<number> {
		const result = this.queue.then(() => this.move());
		this.queue = result.catch(() => undefined);
		return result;
	}

	private async move(): Promise<number> {
		const home = this.folder();
		const strays = this.app.vault.getMarkdownFiles().filter((file) => monthOfName(file.name) !== null && file.parent?.path !== home);
		if (strays.length === 0) return 0;
		await ensureFolderExists(this.app, home);
		const left = new Set<TFolder>();
		let moved = 0;
		for (const file of strays) {
			const target = `${home}/${file.name}`;
			if (this.app.vault.getAbstractFileByPath(target)) continue; // that place is taken: both are read and merged
			left.add(file.parent!);
			await this.app.fileManager.renameFile(file, target);
			moved++;
		}
		if (moved === 0) return 0;
		this.generation++;
		this.cache.clear();
		// a folder the notes left empty goes too, but only one that was made for them
		for (const folder of left) {
			if (folder.name === HISTORY_FOLDER && folder.children.length === 0) await this.app.fileManager.trashFile(folder);
		}
		return moved;
	}

	private folder(): string {
		return normalizePath(`${this.settings.dailyNotePath}/${HISTORY_FOLDER}`);
	}

	private async write(month: string, incoming: Map<string, DayRecord>): Promise<void> {
		let [file] = this.filesOf(month);
		if (!file) {
			await ensureFolderExists(this.app, this.folder());
			try {
				await this.app.vault.create(`${this.folder()}/${HISTORY_FOLDER} ${month}.md`, serializeMonth(month, incoming));
				return;
			} catch (error) {
				// another device synced the month's note in the meantime: the days are merged into that one
				[file] = this.filesOf(month);
				if (!file) throw error;
			}
		}
		await this.app.vault.process(file, (current) => {
			const days = parseMonth(current);
			let changed = false;
			for (const [date, record] of incoming) {
				const before = days.get(date);
				const merged = mergeRecord(before, record);
				if (before && sameRecord(before, merged)) continue;
				days.set(date, merged);
				changed = true;
			}
			return changed ? serializeMonth(month, days) : current;
		});
	}
}
