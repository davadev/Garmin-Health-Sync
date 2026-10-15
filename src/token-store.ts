import type { App } from "obsidian";
import type { OAuth1Token, OAuth2Token } from "./providers/garmin/garmin-oauth";

/** Secret ids: lowercase alphanumeric with dashes, prefixed because the store is shared
 *  with other plugins. */
const OAUTH1_ID = "garmin-health-sync-oauth1";
const OAUTH2_ID = "garmin-health-sync-oauth2";

/** Garmin sign-in tokens live in Obsidian's secret storage (device-local, not in data.json),
 *  so they are not synced to other devices or committed with the vault. */
export function isSecretStorageAvailable(app: App): boolean {
	const store = (app as { secretStorage?: { getSecret?: unknown; setSecret?: unknown } }).secretStorage;
	return typeof store?.getSecret === "function" && typeof store?.setSecret === "function";
}

function parse<T>(raw: string | null | undefined): T | null {
	if (!raw) return null;
	try { return JSON.parse(raw) as T; } catch { return null; }
}

export function readStoredTokens(app: App): { oauth1: OAuth1Token | null; oauth2: OAuth2Token | null } {
	if (!isSecretStorageAvailable(app)) return { oauth1: null, oauth2: null };
	try {
		return {
			oauth1: parse<OAuth1Token>(app.secretStorage.getSecret(OAUTH1_ID)),
			oauth2: parse<OAuth2Token>(app.secretStorage.getSecret(OAUTH2_ID)),
		};
	} catch {
		return { oauth1: null, oauth2: null };
	}
}

/** Writes both tokens (null clears; the API has no delete, so an empty string is stored).
 *  Returns false if secret storage is unavailable or rejected the write. */
export function writeStoredTokens(app: App, oauth1: OAuth1Token | null, oauth2: OAuth2Token | null): boolean {
	if (!isSecretStorageAvailable(app)) return false;
	try {
		const v1 = oauth1 ? JSON.stringify(oauth1) : "";
		const v2 = oauth2 ? JSON.stringify(oauth2) : "";
		app.secretStorage.setSecret(OAUTH1_ID, v1);
		app.secretStorage.setSecret(OAUTH2_ID, v2);
		return app.secretStorage.getSecret(OAUTH1_ID) === v1 && app.secretStorage.getSecret(OAUTH2_ID) === v2;
	} catch {
		return false;
	}
}
