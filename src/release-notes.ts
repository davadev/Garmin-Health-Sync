import type { TranslationKeys } from "./i18n/en";
import type { FigureId } from "./ui/whats-new-figures";

/** One release's user-facing notes. All text lives in the i18n tables (every language is required there),
 *  so an entry only names the keys. Newest first. Never remove an entry of a minor line that is still
 *  current: someone who skipped a release would otherwise see nothing. */
export interface ReleaseNote {
	/** Plain `X.Y.Z`, never a beta suffix. */
	version: string;
	title: TranslationKeys;
	intro: TranslationKeys;
	items: { title: TranslationKeys; text: TranslationKeys; /** A small illustration drawn under the text (see ui/whats-new-figures.ts). */ figure?: FigureId }[];
}

const RELEASE_NOTES: ReleaseNote[] = [
	{
		version: "0.14.1",
		title: "whatsNew0141Title",
		intro: "whatsNew0141Intro",
		items: [{ title: "whatsNew0141Item1Title", text: "whatsNew0141Item1Text" }],
	},
	{
		version: "0.14.0",
		title: "whatsNew0140Title",
		intro: "whatsNew0140Intro",
		items: [
			{ title: "whatsNew0140Item1Title", text: "whatsNew0140Item1Text", figure: "hrv-week" },
			{ title: "whatsNew0140Item2Title", text: "whatsNew0140Item2Text" },
			{ title: "whatsNew0140Item3Title", text: "whatsNew0140Item3Text" },
		],
	},
	{
		version: "0.13.0",
		title: "whatsNew0130Title",
		intro: "whatsNew0130Intro",
		items: [
			{ title: "whatsNew0130Item1Title", text: "whatsNew0130Item1Text", figure: "best-days" },
			{ title: "whatsNew0130Item2Title", text: "whatsNew0130Item2Text" },
			{ title: "whatsNew0130Item3Title", text: "whatsNew0130Item3Text" },
		],
	},
	{
		version: "0.12.1",
		title: "whatsNew0121Title",
		intro: "whatsNew0121Intro",
		items: [
			{ title: "whatsNew0121Item1Title", text: "whatsNew0121Item1Text" },
			{ title: "whatsNew0121Item2Title", text: "whatsNew0121Item2Text" },
		],
	},
	{
		version: "0.12.0",
		title: "whatsNew0120Title",
		intro: "whatsNew0120Intro",
		items: [
			{ title: "whatsNew0120Item1Title", text: "whatsNew0120Item1Text", figure: "panel" },
			{ title: "whatsNew0120Item2Title", text: "whatsNew0120Item2Text", figure: "light-bulb" },
			{ title: "whatsNew0120Item3Title", text: "whatsNew0120Item3Text", figure: "history" },
			{ title: "whatsNew0120Item4Title", text: "whatsNew0120Item4Text", figure: "properties" },
			{ title: "whatsNew0120Item5Title", text: "whatsNew0120Item5Text", figure: "backfill" },
			{ title: "whatsNew0120Item6Title", text: "whatsNew0120Item6Text", figure: "commands" },
			{ title: "whatsNew0120Item7Title", text: "whatsNew0120Item7Text" },
			{ title: "whatsNew0120Item9Title", text: "whatsNew0120Item9Text" },
			// the look-ahead goes last, as in 0.11.2: what the next big release attempts
			{ title: "whatsNew0120Item8Title", text: "whatsNew0120Item8Text" },
		],
	},
	{
		version: "0.11.2",
		title: "whatsNew0112Title",
		intro: "whatsNew0112Intro",
		items: [
			{ title: "whatsNew0112Item1Title", text: "whatsNew0112Item1Text" },
			// Items 2 and 4 (a recap of 0.11.0 and a look ahead) are a one-off for 0.11.2, the first release with this
			// window. They are not part of the regular notes: later entries only describe their own release.
			{ title: "whatsNew0112Item2Title", text: "whatsNew0112Item2Text" },
			{ title: "whatsNew0112Item3Title", text: "whatsNew0112Item3Text" },
			{ title: "whatsNew0112Item4Title", text: "whatsNew0112Item4Text" },
		],
	},
];

type Triple = [number, number, number];

/** `1.2.3`, `1.2.3-beta.4` and `1.2.3+build` all read as 1.2.3 (a beta counts as its release, so the notes
 *  show on the first build that has them and are not repeated by the next beta or the stable release). */
function parse(version: string): Triple | null {
	const m = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version);
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function compare(a: Triple, b: Triple): number {
	return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/** Notes newer than `lastSeen` up to and including `current`, oldest first. An empty or unreadable
 *  `lastSeen` means "never told"; an unreadable `current` shows nothing. */
export function notesToShow(lastSeen: string, current: string, all: ReleaseNote[] = RELEASE_NOTES): ReleaseNote[] {
	const now = parse(current);
	if (!now) return [];
	const seen = parse(lastSeen) ?? [0, 0, 0];
	return all
		.filter((n) => {
			const v = parse(n.version)!;
			return compare(v, seen) > 0 && compare(v, now) <= 0;
		})
		.reverse();
}

/** Every note of the running minor line (for the "Show what's new" command), oldest first. Falls back to
 *  the newest earlier note when this line has none. */
export function notesOfLine(current: string, all: ReleaseNote[] = RELEASE_NOTES): ReleaseNote[] {
	const now = parse(current);
	if (!now) return [];
	const upToNow = all.filter((n) => compare(parse(n.version)!, now) <= 0);
	const sameLine = upToNow.filter((n) => {
		const v = parse(n.version)!;
		return v[0] === now[0] && v[1] === now[1];
	});
	return (sameLine.length > 0 ? sameLine : upToNow.slice(0, 1)).slice().reverse();
}
