import { App, Notice } from "obsidian";
import { t } from "./i18n/t";
import { notesOfLine, notesToShow } from "./release-notes";
import { WhatsNewModal } from "./ui/whats-new-modal";

/** Per device and per vault on purpose (not in data.json, which a vault sync would share between
 *  devices: one device's "Got it" would silence the others). Not a setting either. */
const SEEN_KEY = "garmin-health-sync-whats-new-seen";
const HINTED_KEY = "garmin-health-sync-whats-new-hinted";

/** Obsidian was started this recently: the plugin was loaded by the app start, not enabled or updated while it ran. */
export const STARTUP_WINDOW_MS = 45_000;

function read(app: App, key: string): string {
	try {
		const raw: unknown = app.loadLocalStorage(key);
		return typeof raw === "string" ? raw : "";
	} catch { return ""; }
}

function write(app: App, key: string, value: string): void {
	try { app.saveLocalStorage(key, value); } catch { /* best effort: the worst case is seeing the notes once more */ }
}

/** After an update: show what is new once. A first install only records the version. An update that arrived
 *  while Obsidian was running (BRAT, the community browser) shows one restart hint and leaves the notes for the
 *  next start, so the window never covers whatever the user is doing. The version is recorded before the window
 *  opens, so closing Obsidian with it open does not show it again. */
export function showWhatsNewIfDue(app: App, lang: string, version: string, freshInstall: boolean, sinceAppStartMs: number): void {
	const seen = read(app, SEEN_KEY);
	if (freshInstall && seen === "") {
		write(app, SEEN_KEY, version);
		return;
	}
	const notes = notesToShow(seen, version);
	if (notes.length === 0) return;
	if (sinceAppStartMs >= STARTUP_WINDOW_MS) {
		if (read(app, HINTED_KEY) !== version) {
			write(app, HINTED_KEY, version);
			new Notice(t("noticeWhatsNewRestart", lang).replace("{version}", version), 12_000);
		}
		return;
	}
	write(app, SEEN_KEY, version);
	new WhatsNewModal(app, lang, notes).open();
}

/** The "Show what's new" command: the notes of the running minor line. */
export function showWhatsNewNotes(app: App, lang: string, version: string): void {
	const notes = notesOfLine(version);
	if (notes.length > 0) new WhatsNewModal(app, lang, notes).open();
}
