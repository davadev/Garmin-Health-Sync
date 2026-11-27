// Why it matters: this decides who is told what after an update. A wrong comparison shows the same notes
// again on every start, or shows a user who skipped a release nothing at all.
import { describe, expect, it } from "vitest";
import { notesOfLine, notesToShow, type ReleaseNote } from "../src/release-notes";
import { en, type TranslationKeys } from "../src/i18n/en";
import { de } from "../src/i18n/de";
import { zh } from "../src/i18n/zh";
import { ja } from "../src/i18n/ja";
import { es } from "../src/i18n/es";
import { fr } from "../src/i18n/fr";

const note = (version: string): ReleaseNote => ({ version, title: "whatsNew0112Title", intro: "whatsNew0112Intro", items: [] });
const LIST = [note("0.12.1"), note("0.12.0"), note("0.11.2"), note("0.11.0")]; // newest first, like the real list
const versions = (notes: ReleaseNote[]): string[] => notes.map((n) => n.version);

describe("notesToShow", () => {
	it("returns the notes newer than the last seen version, oldest first (a skipped release is caught up)", () => {
		expect(versions(notesToShow("0.11.0", "0.12.1", LIST))).toEqual(["0.11.2", "0.12.0", "0.12.1"]);
	});

	it("returns nothing when the version was already seen or is older than the notes", () => {
		expect(notesToShow("0.12.1", "0.12.1", LIST)).toEqual([]);
		expect(notesToShow("0.12.1", "0.11.1", LIST)).toEqual([]);
	});

	it("shows everything up to now to somebody who was never told, also when the stored value is junk", () => {
		expect(versions(notesToShow("", "0.11.2", LIST))).toEqual(["0.11.0", "0.11.2"]);
		expect(versions(notesToShow("garbage", "0.11.2", LIST))).toEqual(["0.11.0", "0.11.2"]);
	});

	it("never shows notes of a release newer than the running one", () => {
		expect(versions(notesToShow("0.11.0", "0.11.9", LIST))).toEqual(["0.11.2"]);
	});

	it("reads a beta as its release: shown from the first beta, not repeated by the next beta or the stable release", () => {
		expect(versions(notesToShow("0.11.1", "0.11.2-beta.1", LIST))).toEqual(["0.11.2"]);
		expect(notesToShow("0.11.2", "0.11.2-beta.2", LIST)).toEqual([]);
		expect(notesToShow("0.11.2-beta.1", "0.11.2", LIST)).toEqual([]);
		expect(versions(notesToShow("0.11.1", "0.11.2+build.5", LIST))).toEqual(["0.11.2"]);
	});

	it("shows nothing when the running version cannot be read", () => {
		expect(notesToShow("", "", LIST)).toEqual([]);
		expect(notesToShow("", "1.2", LIST)).toEqual([]);
	});
});

describe("notesOfLine", () => {
	it("returns the notes of the running minor line up to now, oldest first", () => {
		expect(versions(notesOfLine("0.12.1", LIST))).toEqual(["0.12.0", "0.12.1"]);
		expect(versions(notesOfLine("0.11.9", LIST))).toEqual(["0.11.0", "0.11.2"]);
		expect(versions(notesOfLine("0.11.1", LIST))).toEqual(["0.11.0"]);
	});

	it("falls back to the newest earlier note when the line has none", () => {
		expect(versions(notesOfLine("0.13.0", LIST))).toEqual(["0.12.1"]);
	});

	it("returns nothing below the oldest note or for an unreadable version", () => {
		expect(notesOfLine("0.9.0", LIST)).toEqual([]);
		expect(notesOfLine("nope", LIST)).toEqual([]);
	});
});

describe("the shipped notes", () => {
	const shipped = notesToShow("0.0.0", "999.0.0");

	it("are plain X.Y.Z versions, unique, and the default list is newest first", () => {
		expect(shipped.length).toBeGreaterThan(0);
		expect(versions(shipped).every((v) => /^\d+\.\d+\.\d+$/.test(v))).toBe(true);
		expect(new Set(versions(shipped)).size).toBe(shipped.length);
		expect(versions(shipped)).toEqual([...versions(shipped)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
	});

	it("exist in every language, with the same placeholders as English", () => {
		const keys = shipped.flatMap((n) => [n.title, n.intro, ...n.items.flatMap((i) => [i.title, i.text])]);
		const tables: Record<string, Record<TranslationKeys, string>> = { en, de, zh, ja, es, fr };
		for (const [lang, table] of Object.entries(tables)) {
			for (const key of keys) {
				expect(table[key], `${lang}: ${key}`).toBeTruthy();
				expect(table[key].match(/\{\w+\}/g) ?? [], `${lang}: ${key}`).toEqual(en[key].match(/\{\w+\}/g) ?? []);
			}
		}
	});

	it("tells someone who saw 0.12.0 what 0.12.1 changed, and someone coming from 0.11.2 both", () => {
		expect(notesToShow("0.12.0", "0.12.1").map((n) => n.version)).toEqual(["0.12.1"]);
		expect(notesToShow("0.11.2", "0.12.1").map((n) => n.version)).toEqual(["0.12.0", "0.12.1"]);
		expect(notesToShow("0.12.1", "0.12.1")).toEqual([]);
	});

	it("shows the maintenance card to someone updating from 0.14.1, including a beta tester who never saw its notes", () => {
		const notes = notesToShow("0.14.1", "0.14.2");
		expect(notes.map((n) => n.version)).toEqual(["0.14.2"]);
		expect(notes[0]?.title).toBe("whatsNew0142Title");
		expect(notesToShow("0.14.2-beta.1", "0.14.2")).toEqual([]);
	});
});
