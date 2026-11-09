import { ItemView, TFile, WorkspaceLeaf, setIcon, type TAbstractFile } from "obsidian";
import type HealthSyncPlugin from "../main";
import { dateFromDailyNote, dateFromNotePath } from "../daily-note";
import { localDateString, shiftDate } from "../dates";
import { t } from "../i18n/t";
import { SECTION_TITLES, cardHasData, orderedCards, type PanelCard, type SectionId } from "./cards";
import { makeSortable } from "./sortable";
import { HistoryStore } from "../history/store";
import { formatPanelDate } from "./format";
import { DayIndex } from "./index";

export const VIEW_TYPE_HEALTH_PANEL = "garmin-health-panel";
const RENDER_DEBOUNCE_MS = 300;
const MIDNIGHT_CHECK_MS = 60_000;
/** How far back the history notes are read at least for the shown day: the long view of a card looks at a year, and compares the last 90 days with the 90 before. Beyond that all history notes are read, for the personal best and the rank among all days. */
const HISTORY_DAYS = 400;

/** Read-only side panel. Cards are computed from the daily notes' frontmatter; nothing is written or fetched. */
export class HealthPanelView extends ItemView {
	private date = localDateString(new Date());
	/** The shown day is today because nothing else was chosen, so it moves on at midnight. */
	private followsToday = true;
	/** The day of the calendar the panel was last drawn on. */
	private drawnOn = "";
	/** A render was skipped while the leaf was hidden; do it when it is shown again. */
	private dirty = false;
	private readonly index: DayIndex;
	private readonly history: HistoryStore;
	private renderTimer = 0;
	/** Card whose explanation is open; only one at a time. */
	private explain: string | null = null;
	/** The card whose explanation the last draw showed: the folded parts inside it keep their state across a redraw only for the same card. */
	private explainDrawn: string | null = null;
	/** The cards are shown as a list that can be rearranged instead of as cards. */
	private editing = false;

	constructor(leaf: WorkspaceLeaf, private readonly plugin: HealthSyncPlugin) {
		super(leaf);
		this.history = new HistoryStore(this.app, this.plugin.settings);
		this.index = new DayIndex(this.app, () => this.plugin.settings, this.history);
	}

	getViewType(): string {
		return VIEW_TYPE_HEALTH_PANEL;
	}

	getDisplayText(): string {
		return t("panelTitle", this.plugin.settings.language);
	}

	getIcon(): string {
		return "activity";
	}

	onOpen(): Promise<void> {
		this.followActiveNote();
		this.registerEvent(this.app.workspace.on("file-open", () => {
			this.followActiveNote();
			this.render();
		}));
		// A render skipped while the panel was hidden (for instance a closed drawer on a phone while a sync wrote the
		// note) is done as soon as the panel is shown again: switching tabs, opening the sidebar or resizing.
		this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.renderIfDirty()));
		this.registerEvent(this.app.workspace.on("layout-change", () => this.renderIfDirty()));
		// The sync writes notes in bursts: rebuild the index lazily and render once after the burst.
		// a note that is neither a daily note nor a history note changes nothing the panel shows: editing the rest of the vault does not redraw it
		const relevant = (file?: TAbstractFile): boolean => !(file instanceof TFile) || this.history.isHistoryFile(file) || dateFromDailyNote(file, this.plugin.settings) !== null;
		const changed = (file?: TAbstractFile): void => {
			if (!relevant(file)) return;
			// a history note that changed must be read again; every other note leaves what was read alone
			if (file && this.history.isHistoryFile(file)) this.history.invalidate(file);
			this.index.invalidate();
			window.clearTimeout(this.renderTimer);
			this.renderTimer = window.setTimeout(() => this.render(), RENDER_DEBOUNCE_MS);
		};
		this.registerEvent(this.app.metadataCache.on("changed", changed));
		// after a restart the notes' properties are read in the background: what the panel saw before is incomplete
		this.registerEvent(this.app.metadataCache.on("resolved", () => changed()));
		// a panel left open overnight shows the new day (and its date field closes to the days that are still to come)
		this.registerInterval(window.setInterval(() => {
			if (this.drawnOn !== localDateString(new Date())) this.render();
		}, MIDNIGHT_CHECK_MS));
		this.registerEvent(this.app.vault.on("delete", changed));
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
			// a note renamed away from a daily or history name changes the panel too
			const base = typeof oldPath === "string" ? oldPath.slice(oldPath.lastIndexOf("/") + 1) : "";
			const wasHistory = base !== "" && this.history.isHistoryFile({ name: base } as TAbstractFile);
			if (wasHistory) this.history.invalidate();
			if (wasHistory || (base !== "" && dateFromNotePath(oldPath, base.replace(/\.md$/i, ""), this.plugin.settings) !== null)) changed();
			else changed(file);
		}));
		this.render();
		return Promise.resolve();
	}

	/** Obsidian calls this when the panel changes size, which includes a sidebar or drawer opening. */
	onResize(): void {
		this.renderIfDirty();
	}

	private renderIfDirty(): void {
		if (this.dirty) this.render();
	}

	onClose(): Promise<void> {
		window.clearTimeout(this.renderTimer);
		return Promise.resolve();
	}

	/** Re-render after a language change. */
	refresh(): void {
		// a setting may change which notes are daily notes or how they are read
		this.index.invalidate();
		this.render();
	}

	/** The open daily note's date; any other note leaves the shown day as it is. */
	private followActiveNote(): void {
		const file = this.app.workspace.getActiveFile();
		const noted = file instanceof TFile ? dateFromDailyNote(file, this.plugin.settings) : null;
		if (noted === null) return;
		this.date = noted;
		this.followsToday = noted === localDateString(new Date());
	}

	private render(): void {
		// No work for a hidden panel; render on the next reveal.
		if (!this.containerEl.isShown()) {
			this.dirty = true;
			return;
		}
		this.dirty = false;
		this.drawnOn = localDateString(new Date());
		if (this.followsToday) this.date = this.drawnOn;
		this.readHistory();
		const lang = this.plugin.settings.language;
		const root = this.contentEl;
		// a redraw (a sync wrote a note) keeps the place in the panel
		const scrolled = root.scrollTop;
		// ...and so do the folded parts of the open explanation ("how to read this", the grouped interpretations): a redraw while someone is reading them must not close them
		const unfolded: number[] = [];
		if (this.explain !== null && this.explain === this.explainDrawn) root.querySelectorAll("details").forEach((d, i) => d.open && unfolded.push(i));
		root.empty();
		root.addClass("ghs-panel");

		const today = localDateString(new Date());
		const nav = root.createDiv({ cls: "ghs-daynav" });
		this.navButton(nav, "chevron-left", t("panelPrevDay", lang), () => this.move(-1), false);
		// the date is also a day picker: a date field of the system lies invisibly over it, so a tap opens the calendar
		const pick = nav.createDiv({ cls: "ghs-daynav-pick" });
		setIcon(pick.createSpan({ cls: "ghs-daynav-icon" }), "calendar");
		pick.createSpan({ cls: "ghs-daynav-date", text: formatPanelDate(this.date, lang) });
		const input = pick.createEl("input", { cls: "ghs-daynav-input", attr: { type: "date", max: today, "aria-label": t("panelPickDay", lang) } });
		input.value = this.date;
		input.addEventListener("click", () => {
			try {
				input.showPicker?.();
			} catch {
				// the browser did not allow it here; the field itself still takes a date
			}
		});
		input.addEventListener("change", () => {
			if (input.value === "" || input.value > today) return;
			this.date = input.value;
			this.followsToday = this.date === today;
			this.render();
		});
		this.navButton(nav, "chevron-right", t("panelNextDay", lang), () => this.move(1), this.date >= today);
		this.navButton(nav, this.editing ? "check" : "pencil", t(this.editing ? "panelEditDone" : "panelEdit", lang), () => {
			this.editing = !this.editing;
			this.render();
		}, false);
		// the same as the command "Sync current note": the panel is where the day is looked at, so it is where a refresh is wanted
		this.navButton(nav, "refresh-cw", t("commandSync", lang), () => void this.plugin.manualSync(), false);

		// no daily note was recognised: say what is looked for, instead of cards that all say "no reading"
		const overview = this.index.overview();
		if (!this.editing && overview.notes > 0 && overview.withData === 0 && this.history.empty) {
			root.createDiv({ cls: "ghs-panel-empty", text: t("panelNoGarminData", lang).replace("{count}", String(overview.notes)).replace("{date}", overview.newest!) });
		}
		if (!this.editing && !this.index.hasAnyDay()) {
			const { dailyNotePath, dailyNoteFormat } = this.plugin.settings;
			root.createDiv({ cls: "ghs-panel-empty", text: (dailyNotePath ? t("panelNoNotesIn", lang).replace("{folder}", dailyNotePath) : t("panelNoNotes", lang)).replace("{format}", dailyNoteFormat || "YYYY-MM-DD") });
		}

		if (this.editing) this.renderEditor(root, lang);
		else this.renderCards(root, lang);
		root.querySelectorAll("details").forEach((d, i) => {
			if (unfolded.includes(i)) d.open = true;
		});
		this.explainDrawn = this.explain;
		root.scrollTop = scrolled;
	}

	/** Reads the history notes the shown day needs; a note that was read changes the cards, so they are drawn again. */
	private readHistory(): void {
		const year = shiftDate(this.date, -HISTORY_DAYS);
		const first = this.history.firstMonth();
		const from = first !== null && `${first}-01` < year ? `${first}-01` : year;
		if (this.history.covers(from, this.date)) return;
		void this.history.warm(from, this.date).then((found) => {
			if (found) {
				// what the cards worked out before the history was read is out of date
				this.index.touch();
				this.render();
			}
		});
	}

	/**
	 * The cards to show: the ones the user did not switch off and, for settings that choose by data, only those that have
	 * something to show (a card the user switched on is always shown). When none has, all are shown, so the panel is never blank.
	 */
	private visibleCards(): PanelCard[] {
		const { panelCards, panelAuto, panelOrder, lifestyleHabits } = this.plugin.settings;
		const cards = orderedCards(panelOrder).filter((card) => panelCards[card.id] !== false);
		if (!panelAuto) return cards;
		const today = localDateString(new Date());
		const withData = cards.filter((card) => panelCards[card.id] === true || cardHasData(card, this.index, today, lifestyleHabits));
		return withData.length > 0 ? withData : cards;
	}

	/** The cards that are shown, in order, under their section headers; half-width cards pair up. */
	private renderCards(root: HTMLElement, lang: string): void {
		let section: SectionId | null = null;
		let pair: HTMLElement | null = null;
		for (const card of this.visibleCards()) {
			if (card.section !== section) {
				section = card.section;
				pair = null;
				root.createDiv({ cls: "ghs-section", text: t(SECTION_TITLES[section], lang) });
			}
			if (card.half) pair ??= root.createDiv({ cls: "ghs-pair" });
			else pair = null;
			card.render({
				parent: card.half ? (pair as HTMLElement) : root,
				index: this.index,
				date: this.date,
				lang,
				imperial: this.plugin.settings.unitSystem === "imperial",
				birthYear: this.plugin.settings.birthYear,
				habits: this.plugin.settings.lifestyleHabits,
				hiddenHabits: this.plugin.settings.hiddenHabits,
				onHideHabit: (key, hide) => void this.setHabitHidden(key, hide),
				explainOpen: this.explain === card.id,
				onToggleExplain: () => {
					this.explain = this.explain === card.id ? null : card.id;
					this.render();
				},
			});
		}
	}

	/** The cards as a list of titles with a handle each; dragging a handle, or the arrow keys on it, changes the order. */
	private renderEditor(root: HTMLElement, lang: string): void {
		root.createDiv({ cls: "ghs-edit-hint", text: t("panelEditHint", lang) });
		const list = root.createDiv({ cls: "ghs-sort" });
		for (const card of orderedCards(this.plugin.settings.panelOrder)) {
			if (this.plugin.settings.panelCards[card.id] === false) continue;
			const row = list.createDiv({ cls: "ghs-sort-row", attr: { "data-id": card.id } });
			const handle = row.createEl("button", { cls: "clickable-icon ghs-sort-handle", attr: { "aria-label": t("panelDragHandle", lang).replace("{card}", t(card.title, lang)) } });
			setIcon(handle, "grip-vertical");
			row.createSpan({ cls: "ghs-sort-title", text: t(card.title, lang) });
			row.createSpan({ cls: "ghs-sort-section", text: t(SECTION_TITLES[card.section], lang) });
		}
		makeSortable(list, (ids) => void this.saveOrder(ids));
		root.createEl("button", { cls: "ghs-edit-reset", text: t("panelEditReset", lang) }).addEventListener("click", () => void this.saveOrder([]));
	}

	/** Hides a habit of the Habits card or shows it again; the choice is kept in the settings, not offered there. */
	private async setHabitHidden(key: string, hide: boolean): Promise<void> {
		const rest = this.plugin.settings.hiddenHabits.filter((k) => k !== key);
		this.plugin.settings.hiddenHabits = hide ? [...rest, key] : rest;
		await this.plugin.saveSettings();
		this.render();
	}

	private async saveOrder(ids: string[]): Promise<void> {
		this.plugin.settings.panelOrder = ids;
		await this.plugin.saveSettings();
		this.render();
	}

	private navButton(parent: HTMLElement, icon: string, label: string, onClick: () => void, disabled: boolean): void {
		const button = parent.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label } });
		setIcon(button, icon);
		if (disabled) button.disabled = true;
		else button.addEventListener("click", onClick);
	}

	private move(days: number): void {
		this.date = shiftDate(this.date, days);
		this.followsToday = this.date === localDateString(new Date());
		this.render();
	}
}
